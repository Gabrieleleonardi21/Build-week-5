import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { NotificationResponse, UserResponse } from '@/lib/types'
import { fakeRealtime } from '@/test/fake-stomp'
import { API, EMPTY_PAGE, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const ME: UserResponse = { id: 'u1', email: 'anna@mail.it', firstName: 'Anna', lastName: 'Bianchi', role: 'USER', avatarUrl: null }

function notification(overrides: Partial<NotificationResponse> = {}): NotificationResponse {
  return {
    id: 'n1',
    type: 'EVENT_UPDATED',
    title: 'Evento modificato',
    body: 'Jazz sotto le stelle ha cambiato orario.',
    eventId: 'e1',
    readAt: null,
    createdAt: '2027-06-01T10:00:00Z',
    ...overrides,
  }
}

function page(items: NotificationResponse[], totalPages = 1) {
  return { content: items, page: { size: 20, number: 0, totalElements: items.length, totalPages } }
}

/** Backend finto con stato: segnare come letta cambia la lista e il contatore successivi. */
function setup(initial: NotificationResponse[]) {
  let items = initial
  const readCalls: string[] = []
  server.use(
    http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
    http.get(`${API}/api/notifications`, () => HttpResponse.json(page(items))),
    http.get(`${API}/api/notifications/unread-count`, () =>
      HttpResponse.json({ unread: items.filter((item) => item.readAt === null).length }),
    ),
    http.patch(`${API}/api/notifications/:id/read`, ({ params }) => {
      readCalls.push(String(params.id))
      items = items.map((item) => {
        if (item.id !== params.id) {
          return item
        }
        return { ...item, readAt: '2027-06-01T11:00:00Z' }
      })
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return {
    readCalls,
    add: (item: NotificationResponse) => {
      items = [item, ...items]
    },
  }
}

describe('NotificationsPage', () => {
  it('mostra le notifiche con il link giusto e quante sono da leggere', async () => {
    setup([
      notification(),
      notification({ id: 'n2', type: 'FRIEND_REQUEST', title: 'Nuova richiesta di amicizia', body: 'Elena vuole stringere amicizia.', eventId: null, readAt: '2027-06-01T10:30:00Z' }),
    ])
    renderRoute('/notifications')

    expect(await screen.findByText('Evento modificato')).toBeInTheDocument()
    expect(screen.getByText('1 notifica da leggere.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Vai all'evento" })).toHaveAttribute('href', '/events/e1')
    expect(screen.getByRole('link', { name: 'Vedi la richiesta' })).toHaveAttribute('href', '/friends?tab=ricevute')
    // Solo la non letta ha il bottone per segnarla.
    expect(screen.getAllByRole('button', { name: /Segna come letta/ })).toHaveLength(1)
  })

  it('segna una notifica come letta e aggiorna contatore e campanella', async () => {
    const backend = setup([notification()])
    renderRoute('/notifications')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Segna come letta: Evento modificato' }))

    await waitFor(() => expect(backend.readCalls).toEqual(['n1']))
    expect(await screen.findByText('Nessuna notifica da leggere.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Segna come letta/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Notifiche' })).toBeInTheDocument()
  })

  it('"Segna tutte come lette" segna le non lette della pagina', async () => {
    const backend = setup([notification(), notification({ id: 'n2', title: 'Evento annullato', type: 'EVENT_CANCELLED' }), notification({ id: 'n3', readAt: '2027-06-01T10:30:00Z' })])
    renderRoute('/notifications')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Segna tutte come lette' }))

    await waitFor(() => expect([...backend.readCalls].sort()).toEqual(['n1', 'n2']))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Segna tutte come lette' })).not.toBeInTheDocument())
  })

  it('una notifica arrivata in tempo reale compare senza ricaricare', async () => {
    const backend = setup([])
    renderRoute('/notifications')
    expect(await screen.findByRole('heading', { name: 'Nessuna notifica' })).toBeInTheDocument()
    await waitFor(() => expect(fakeRealtime.active).toBe(1))

    const incoming = notification({ id: 'n9', type: 'NEW_PARTICIPANT', title: 'Nuovo partecipante', body: 'Luca si è iscritto.' })
    backend.add(incoming)
    act(() => fakeRealtime.notification(incoming))

    const list = await screen.findByRole('list')
    expect(await within(list).findByText('Nuovo partecipante')).toBeInTheDocument()
  })

  it('lista vuota', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
      http.get(`${API}/api/notifications`, () => HttpResponse.json(EMPTY_PAGE)),
    )
    renderRoute('/notifications')

    expect(await screen.findByRole('heading', { name: 'Nessuna notifica' })).toBeInTheDocument()
  })

  it('errore del server: messaggio e Riprova', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
      http.get(`${API}/api/notifications`, () => HttpResponse.json({ status: 500, detail: 'Errore interno' }, { status: 500 })),
    )
    renderRoute('/notifications')

    expect(await screen.findByRole('alert')).toHaveTextContent('Errore interno')
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })
})
