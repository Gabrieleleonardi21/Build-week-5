import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { EventSummaryResponse, UserResponse } from '@/lib/types'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

function event(id: string, title: string, overrides: Partial<EventSummaryResponse> = {}): EventSummaryResponse {
  return {
    id,
    title,
    startsAt: '2027-06-14T19:00:00Z',
    endsAt: '2027-06-14T22:00:00Z',
    venueName: 'Piazza Maggiore',
    city: 'Bologna',
    province: 'BO',
    latitude: 44.49,
    longitude: 11.34,
    status: 'PUBLISHED',
    coverUrl: null,
    ...overrides,
  }
}

function page(content: EventSummaryResponse[], number = 0, totalPages = 1) {
  return { content, page: { size: 10, number, totalElements: content.length, totalPages } }
}

const ME: UserResponse = { id: 'u1', email: 'x@test.it', firstName: 'Marco', lastName: 'Rinaldi', role: 'USER', avatarUrl: null }

function login() {
  server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)))
}

describe('MyEventsPage', () => {
  it('elenca i miei eventi con stato, link al dettaglio e alla modifica (non per gli annullati)', async () => {
    login()
    server.use(
      http.get(`${API}/api/me/events`, () =>
        HttpResponse.json(
          page([
            event('e1', 'Jazz sotto le stelle'),
            event('e2', 'Rock in cortile', { status: 'CANCELLED' }),
            event('e3', 'Folk di ieri', { startsAt: '2020-01-01T19:00:00Z', endsAt: null }),
          ]),
        ),
      ),
    )
    renderRoute('/me/events')

    expect(await screen.findByRole('link', { name: 'Jazz sotto le stelle' })).toHaveAttribute('href', '/events/e1')
    expect(screen.getByRole('link', { name: 'Modifica Jazz sotto le stelle' })).toHaveAttribute('href', '/events/e1/edit')

    const cancelled = screen.getByRole('link', { name: 'Rock in cortile' }).closest('li') as HTMLElement
    expect(within(cancelled).getByText('Annullato')).toBeInTheDocument()
    expect(within(cancelled).queryByRole('link', { name: /Modifica/ })).not.toBeInTheDocument()

    const past = screen.getByRole('link', { name: 'Folk di ieri' }).closest('li') as HTMLElement
    expect(within(past).getByText('Concluso')).toBeInTheDocument()
  })

  it('nessun evento: invito a crearne uno', async () => {
    login()
    server.use(http.get(`${API}/api/me/events`, () => HttpResponse.json(page([]))))
    renderRoute('/me/events')

    expect(await screen.findByRole('heading', { name: 'Non hai ancora creato eventi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crea il tuo primo evento' })).toHaveAttribute('href', '/events/new')
  })

  it('paginazione: la pagina va nell\'URL e nella richiesta', async () => {
    login()
    const pages: Array<string | null> = []
    server.use(
      http.get(`${API}/api/me/events`, ({ request }) => {
        const number = new URL(request.url).searchParams.get('page')
        pages.push(number)
        return HttpResponse.json(page([event(`e${number}`, `Evento ${number}`)], Number(number), 2))
      }),
    )
    const { router } = renderRoute('/me/events')
    await screen.findByText('Pagina 1 di 2')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Successiva' }))

    expect(await screen.findByRole('link', { name: 'Evento 1' })).toBeInTheDocument()
    expect(pages).toEqual(['0', '1'])
    expect(router.state.location.search).toBe('?page=2')
  })

  it('errore del server: messaggio e Riprova', async () => {
    login()
    server.use(http.get(`${API}/api/me/events`, () => HttpResponse.json({ status: 500, detail: 'Errore interno' }, { status: 500 })))
    renderRoute('/me/events')

    expect(await screen.findByRole('alert')).toHaveTextContent('Errore interno')
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })

  it('anonimo: si va al login', async () => {
    server.use(http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })))
    const { router } = renderRoute('/me/events')

    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })
})
