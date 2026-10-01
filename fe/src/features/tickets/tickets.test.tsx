import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { EventResponse, Page, ParticipantResponse, TicketResponse, UserResponse } from '@/lib/types'
import { API, EMPTY_PAGE, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

// La mappa (Leaflet) in jsdom non serve: qui si provano iscrizione e partecipanti.
vi.mock('@/features/events/components/EventLocationMap', () => ({
  EventLocationMap: () => <div data-testid="map" />,
}))

const ME: UserResponse = { id: 'me', email: 'luca@test.it', firstName: 'Luca', lastName: 'Moretti', role: 'USER', avatarUrl: null }
const NOT_ENROLLED = () => HttpResponse.json({ status: 404, detail: 'Non sei iscritto a questo evento' }, { status: 404 })

function event(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'e1',
    title: 'Jazz sotto le stelle',
    description: null,
    startsAt: '2099-06-14T19:00:00Z',
    endsAt: null,
    venueName: 'Piazza Maggiore',
    address: 'Piazza Maggiore 1',
    city: 'Bologna',
    province: 'BO',
    latitude: 44.49,
    longitude: 11.34,
    maxParticipants: 300,
    participants: 3,
    status: 'PUBLISHED',
    owner: { id: 'owner-1', firstName: 'Marco', lastName: 'Rinaldi', avatarUrl: null },
    images: [],
    lineup: [],
    markers: [],
    createdAt: '2027-01-01T10:00:00Z',
    updatedAt: '2027-01-01T10:00:00Z',
    ...overrides,
  }
}

function ticket(overrides: Partial<TicketResponse> = {}): TicketResponse {
  const { id, title, startsAt, endsAt, venueName, city, province, latitude, longitude, status } = event()
  return {
    id: 't1',
    code: 'EVT-7K3M9QA2',
    status: 'VALID',
    issuedAt: '2027-01-02T10:00:00Z',
    event: { id, title, startsAt, endsAt, venueName, city, province, latitude, longitude, status, coverUrl: null },
    ...overrides,
  }
}

function page<T>(content: T[], totalPages = 1): Page<T> {
  return { content, page: { size: 12, number: 0, totalElements: content.length, totalPages } }
}

/** Utente loggato (o anonimo con null) davanti al dettaglio di un evento. */
function setup(current: EventResponse, me: UserResponse | null = ME) {
  server.use(
    http.get(`${API}/api/auth/me`, () => {
      if (me === null) {
        return new HttpResponse(null, { status: 401 })
      }
      return HttpResponse.json(me)
    }),
    http.get(`${API}/api/events/:id`, () => HttpResponse.json(current)),
    http.get(`${API}/api/events/:id/tickets/me`, NOT_ENROLLED),
    http.get(`${API}/api/events/:id/participants`, () => HttpResponse.json(EMPTY_PAGE)),
  )
}

describe('JoinButton', () => {
  it('anonimo: link al login; a evento iniziato solo il motivo', async () => {
    setup(event(), null)
    const first = renderRoute('/events/e1')
    expect(await screen.findByRole('link', { name: 'Accedi per iscriverti' })).toHaveAttribute('href', '/login')
    first.unmount()

    setup(event({ startsAt: '2020-01-01T10:00:00Z' }), null)
    renderRoute('/events/e1')
    expect(await screen.findByText("Iscrizioni chiuse: l'evento è già iniziato.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Accedi per iscriverti' })).not.toBeInTheDocument()
  })

  it('non iscritto: "Partecipa" emette il ticket e mostra il codice', async () => {
    setup(event())
    let posted = false
    server.use(
      http.post(`${API}/api/events/e1/tickets`, () => {
        posted = true
        // Da qui in poi il backend risponde con il ticket anche alla rilettura.
        server.use(http.get(`${API}/api/events/:id/tickets/me`, () => HttpResponse.json(ticket())))
        return HttpResponse.json(ticket(), { status: 201 })
      }),
    )
    renderRoute('/events/e1')

    await userEvent.click(await screen.findByRole('button', { name: 'Partecipa' }))

    expect(await screen.findByText('Sei iscritto')).toBeInTheDocument()
    expect(screen.getByText('EVT-7K3M9QA2')).toBeInTheDocument()
    expect(posted).toBe(true)
    expect(screen.getByRole('button', { name: 'Annulla iscrizione' })).toBeInTheDocument()
  })

  it('409: mostra il messaggio del backend', async () => {
    setup(event())
    server.use(
      http.post(`${API}/api/events/e1/tickets`, () => HttpResponse.json({ status: 409, detail: 'Evento al completo' }, { status: 409 })),
    )
    renderRoute('/events/e1')

    await userEvent.click(await screen.findByRole('button', { name: 'Partecipa' }))

    expect(await screen.findByText('Evento al completo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Partecipa' })).toBeEnabled()
  })

  it('iscritto: annulla con conferma e torna "Partecipa"', async () => {
    setup(event())
    let deleted = false
    server.use(
      http.get(`${API}/api/events/:id/tickets/me`, () => HttpResponse.json(ticket())),
      http.delete(`${API}/api/events/e1/tickets/me`, () => {
        deleted = true
        server.use(http.get(`${API}/api/events/:id/tickets/me`, NOT_ENROLLED))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/events/e1')

    await userEvent.click(await screen.findByRole('button', { name: 'Annulla iscrizione' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Annulla iscrizione' }))

    expect(await screen.findByRole('button', { name: 'Partecipa' })).toBeInTheDocument()
    expect(deleted).toBe(true)
  })

  it('iscritto a un evento iniziato: codice visibile, niente annullamento', async () => {
    setup(event({ startsAt: '2020-01-01T10:00:00Z' }))
    server.use(http.get(`${API}/api/events/:id/tickets/me`, () => HttpResponse.json(ticket())))
    renderRoute('/events/e1')

    expect(await screen.findByText('EVT-7K3M9QA2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Annulla iscrizione' })).not.toBeInTheDocument()
  })

  it('evento annullato, al completo, organizzatore: niente iscrizione, con il motivo', async () => {
    setup(event({ status: 'CANCELLED' }))
    const cancelled = renderRoute('/events/e1')
    expect(await screen.findByText('Evento annullato: le iscrizioni sono chiuse.')).toBeInTheDocument()
    cancelled.unmount()

    setup(event({ maxParticipants: 3, participants: 3 }))
    const full = renderRoute('/events/e1')
    expect(await screen.findByRole('button', { name: 'Posti esauriti' })).toBeDisabled()
    full.unmount()

    setup(event({ owner: { id: ME.id, firstName: 'Luca', lastName: 'Moretti', avatarUrl: null } }))
    renderRoute('/events/e1')
    expect(await screen.findByText("Sei l'organizzatore di questo evento.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Partecipa' })).not.toBeInTheDocument()
  })

  it('errore di rete sul ticket: messaggio e "Riprova"', async () => {
    setup(event())
    server.use(http.get(`${API}/api/events/:id/tickets/me`, () => HttpResponse.json({ status: 500 }, { status: 500 })))
    renderRoute('/events/e1')

    await screen.findByRole('heading', { level: 1 })
    server.use(http.get(`${API}/api/events/:id/tickets/me`, NOT_ENROLLED))
    const retry = await screen.findAllByRole('button', { name: 'Riprova' })
    await userEvent.click(retry[0] as HTMLElement)
    expect(await screen.findByRole('button', { name: 'Partecipa' })).toBeInTheDocument()
  })
})

describe('ParticipantsList', () => {
  const SARA: ParticipantResponse = { id: 'u2', firstName: 'Sara', lastName: 'Colombo', avatarUrl: null }
  const MYSELF: ParticipantResponse = { id: ME.id, firstName: 'Luca', lastName: 'Moretti', avatarUrl: null }

  it('403: invito a iscriversi al posto della lista', async () => {
    setup(event())
    server.use(
      http.get(`${API}/api/events/:id/participants`, () =>
        HttpResponse.json({ status: 403, detail: 'Solo chi partecipa vede gli altri partecipanti' }, { status: 403 }),
      ),
    )
    renderRoute('/events/e1')

    expect(await screen.findByText("Iscriviti all'evento per vedere chi partecipa.")).toBeInTheDocument()
  })

  it('nessun iscritto', async () => {
    setup(event())
    renderRoute('/events/e1')

    expect(await screen.findByText('Ancora nessun iscritto.')).toBeInTheDocument()
  })

  it('elenco con link al profilo; la richiesta di amicizia parte con utente ed evento', async () => {
    setup(event())
    let body: unknown = null
    server.use(
      http.get(`${API}/api/events/:id/participants`, () => HttpResponse.json(page([MYSELF, SARA]))),
      http.post(`${API}/api/friendships`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'f1', user: SARA, eventId: 'e1', eventTitle: 'Jazz sotto le stelle', createdAt: '2027-01-02T10:00:00Z' }, { status: 201 })
      }),
    )
    renderRoute('/events/e1')

    expect(await screen.findByRole('link', { name: 'Sara Colombo' })).toHaveAttribute('href', '/users/u2')
    // A se stessi l'amicizia non si chiede.
    expect(screen.queryByRole('button', { name: "Chiedi l'amicizia a Luca" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: "Chiedi l'amicizia a Sara" }))

    expect(await screen.findByText('Richiesta inviata')).toBeInTheDocument()
    expect(body).toEqual({ addresseeId: 'u2', eventId: 'e1' })
  })

  it('409: al posto del bottone lo stato dell’amicizia; altri errori restano riprovabili', async () => {
    setup(event())
    server.use(
      http.get(`${API}/api/events/:id/participants`, () => HttpResponse.json(page([SARA]))),
      http.post(`${API}/api/friendships`, () => HttpResponse.json({ status: 409, detail: "Siete gia' amici" }, { status: 409 })),
    )
    const first = renderRoute('/events/e1')
    await userEvent.click(await screen.findByRole('button', { name: "Chiedi l'amicizia a Sara" }))
    expect(await screen.findByText("Siete gia' amici")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Chiedi l'amicizia a Sara" })).not.toBeInTheDocument()
    first.unmount()

    server.use(
      http.post(`${API}/api/friendships`, () =>
        HttpResponse.json({ status: 403, detail: "Potete diventare amici solo se partecipate entrambi all'evento" }, { status: 403 }),
      ),
    )
    renderRoute('/events/e1')
    await userEvent.click(await screen.findByRole('button', { name: "Chiedi l'amicizia a Sara" }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Potete diventare amici solo se partecipate entrambi')
    expect(screen.getByRole('button', { name: "Chiedi l'amicizia a Sara" })).toBeEnabled()
  })
})

describe('MyTicketsPage', () => {
  function login() {
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)))
  }

  it('mostra i ticket con evento, codice e link al dettaglio', async () => {
    login()
    server.use(http.get(`${API}/api/me/tickets`, () => HttpResponse.json(page([ticket()]))))
    renderRoute('/me/tickets')

    expect(await screen.findByRole('link', { name: 'Jazz sotto le stelle' })).toHaveAttribute('href', '/events/e1')
    expect(screen.getByText('EVT-7K3M9QA2')).toBeInTheDocument()
    expect(screen.getByText('Piazza Maggiore, Bologna')).toBeInTheDocument()
  })

  it('evento annullato: etichetta sulla card', async () => {
    login()
    const cancelled = ticket({ event: { ...ticket().event, status: 'CANCELLED', venueName: null } })
    server.use(http.get(`${API}/api/me/tickets`, () => HttpResponse.json(page([cancelled]))))
    renderRoute('/me/tickets')

    expect(await screen.findByText('Annullato')).toBeInTheDocument()
    expect(screen.getByText('Bologna')).toBeInTheDocument()
  })

  it('vuoto: invito a scoprire gli eventi', async () => {
    login()
    server.use(http.get(`${API}/api/me/tickets`, () => HttpResponse.json(EMPTY_PAGE)))
    renderRoute('/me/tickets')

    expect(await screen.findByRole('heading', { name: 'Non hai ancora ticket' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Scopri gli eventi' })).toHaveAttribute('href', '/')
  })

  it('errore: messaggio e "Riprova"', async () => {
    login()
    server.use(http.get(`${API}/api/me/tickets`, () => HttpResponse.json({ status: 503, detail: 'Servizio non disponibile' }, { status: 503 })))
    renderRoute('/me/tickets')

    expect(await screen.findByRole('alert')).toHaveTextContent('Servizio non disponibile')
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })

  it('paginazione: la pagina va nell’URL e nella richiesta', async () => {
    login()
    const pages: string[] = []
    server.use(
      http.get(`${API}/api/me/tickets`, ({ request }) => {
        pages.push(new URL(request.url).searchParams.get('page') ?? '')
        return HttpResponse.json(page([ticket()], 2))
      }),
    )
    const { router } = renderRoute('/me/tickets')

    await userEvent.click(await screen.findByRole('button', { name: 'Successiva' }))

    await waitFor(() => expect(pages).toContain('1'))
    expect(router.state.location.search).toBe('?page=2')
  })

  it('anonimo: si va al login', async () => {
    server.use(http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })))
    const { router } = renderRoute('/me/tickets')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
