import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import type { EventResponse, Role, UserResponse } from '@/lib/types'
import { API, EMPTY_PAGE, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

// Qui si provano solo le azioni di gestione: mappa, iscrizione e partecipanti hanno i loro test.
vi.mock('./EventLocationMap', () => ({ EventLocationMap: () => null }))
vi.mock('@/features/tickets/components/JoinButton', () => ({ JoinButton: () => null }))
vi.mock('@/features/tickets/components/ParticipantsList', () => ({ ParticipantsList: () => null }))
// Il Toaster non e' montato nei test: si controlla che il toast venga chiesto col messaggio giusto.
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const OWNER_ID = 'owner-1'

function detail(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'e1',
    title: 'Jazz sotto le stelle',
    description: null,
    startsAt: '2027-06-14T19:00:00Z',
    endsAt: null,
    venueName: null,
    address: 'Piazza Maggiore 1',
    city: 'Bologna',
    province: 'BO',
    latitude: 44.49,
    longitude: 11.34,
    maxParticipants: null,
    participants: 0,
    status: 'PUBLISHED',
    owner: { id: OWNER_ID, firstName: 'Marco', lastName: 'Rinaldi', avatarUrl: null },
    images: [],
    lineup: [],
    markers: [],
    createdAt: '2027-01-01T10:00:00Z',
    updatedAt: '2027-01-01T10:00:00Z',
    ...overrides,
  }
}

/** Evento servito dal backend finto: i test lo cambiano per simulare l'effetto delle azioni. */
function setup(initial: EventResponse, me: { id: string; role: Role } = { id: OWNER_ID, role: 'USER' }) {
  const state = { event: initial }
  const user: UserResponse = { id: me.id, email: 'x@test.it', firstName: 'Marco', lastName: 'Rinaldi', role: me.role, avatarUrl: null }
  server.use(
    http.get(`${API}/api/auth/me`, () => HttpResponse.json(user)),
    http.get(`${API}/api/events/e1`, () => HttpResponse.json(state.event)),
  )
  return state
}

async function confirm(user: ReturnType<typeof userEvent.setup>, trigger: string, confirmLabel: string) {
  await user.click(await screen.findByRole('button', { name: trigger }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: confirmLabel }))
}

describe('OwnerActions', () => {
  it('proprietario: modifica, messaggio, annulla ed elimina', async () => {
    setup(detail())
    renderRoute('/events/e1')

    expect(await screen.findByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/events/e1/edit')
    expect(screen.getByRole('button', { name: 'Scrivi ai partecipanti' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annulla evento' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elimina' })).toBeInTheDocument()
  })

  it('moderatore non proprietario: niente messaggio ai partecipanti (solo il proprietario puo\')', async () => {
    setup(detail(), { id: 'mod-1', role: 'MODERATOR' })
    renderRoute('/events/e1')

    expect(await screen.findByRole('button', { name: 'Annulla evento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Scrivi ai partecipanti' })).not.toBeInTheDocument()
  })

  it('evento annullato: restano solo messaggio ed elimina', async () => {
    setup(detail({ status: 'CANCELLED' }))
    renderRoute('/events/e1')

    expect(await screen.findByRole('button', { name: 'Elimina' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Modifica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Annulla evento' })).not.toBeInTheDocument()
  })

  it('annulla: POST /cancel, poi la pagina mostra l\'evento annullato', async () => {
    const state = setup(detail())
    let cancelled = false
    server.use(
      http.post(`${API}/api/events/e1/cancel`, () => {
        cancelled = true
        state.event = detail({ status: 'CANCELLED' })
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/events/e1')
    await confirm(userEvent.setup(), 'Annulla evento', 'Annulla evento')

    expect(await screen.findByRole('status')).toHaveTextContent('Evento annullato')
    expect(cancelled).toBe(true)
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Evento annullato'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Annulla evento' })).not.toBeInTheDocument())
  })

  it('elimina: DELETE e ritorno a "I miei eventi"', async () => {
    setup(detail())
    server.use(
      http.delete(`${API}/api/events/e1`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/api/me/events`, () => HttpResponse.json(EMPTY_PAGE)),
    )
    const { router } = renderRoute('/events/e1')
    await confirm(userEvent.setup(), 'Elimina', 'Elimina evento')

    await waitFor(() => expect(router.state.location.pathname).toBe('/me/events'))
    expect(toast.success).toHaveBeenCalledWith('Evento eliminato')
  })

  it('elimina con iscritti (409): propone di annullare e resta sulla pagina', async () => {
    setup(detail({ participants: 4 }))
    server.use(http.delete(`${API}/api/events/e1`, () => HttpResponse.json({ status: 409, detail: 'ha partecipanti' }, { status: 409 })))
    const { router } = renderRoute('/events/e1')
    await confirm(userEvent.setup(), 'Elimina', 'Elimina evento')

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('usa "Annulla evento"')))
    expect(router.state.location.pathname).toBe('/events/e1')
    // Il dialog resta aperto: l'azione non e' riuscita.
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('messaggio ai partecipanti: validazione, POST e chiusura del dialog', async () => {
    setup(detail())
    let body: unknown
    server.use(
      http.post(`${API}/api/events/e1/messages`, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/events/e1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Scrivi ai partecipanti' }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: 'Invia a tutti i partecipanti' }))
    expect(await within(dialog).findByText('Inserisci un titolo')).toBeInTheDocument()
    expect(within(dialog).getByText('Scrivi il messaggio')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Titolo'), 'Cambio orario')
    await user.type(within(dialog).getByLabelText('Messaggio'), 'Si inizia alle 22.')
    await user.click(within(dialog).getByRole('button', { name: 'Invia a tutti i partecipanti' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(body).toEqual({ title: 'Cambio orario', body: 'Si inizia alle 22.' })
    expect(toast.success).toHaveBeenCalledWith('Messaggio inviato ai partecipanti')
  })

  it('messaggio rifiutato dal backend (403): errore nel dialog', async () => {
    setup(detail())
    server.use(
      http.post(`${API}/api/events/e1/messages`, () =>
        HttpResponse.json({ status: 403, detail: 'Solo il proprietario scrive ai partecipanti' }, { status: 403 }),
      ),
    )
    renderRoute('/events/e1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Scrivi ai partecipanti' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Titolo'), 'Ciao')
    await user.type(within(dialog).getByLabelText('Messaggio'), 'Testo')
    await user.click(within(dialog).getByRole('button', { name: 'Invia a tutti i partecipanti' }))

    expect(await within(dialog).findByText('Solo il proprietario scrive ai partecipanti')).toBeInTheDocument()
  })
})
