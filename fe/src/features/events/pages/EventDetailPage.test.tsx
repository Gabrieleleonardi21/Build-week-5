import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { EventResponse, Role, UserResponse } from '@/lib/types'
import { API, EMPTY_PAGE, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

// La mappa (Leaflet) in jsdom non serve: si controlla che riceva l'evento giusto.
vi.mock('../components/EventLocationMap', () => ({
  EventLocationMap: ({ event }: { event: EventResponse }) => <div data-testid="map">{event.markers.length} marker</div>,
}))

const OWNER_ID = 'owner-1'

function detail(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'e1',
    title: 'Jazz sotto le stelle',
    description: 'Porta una coperta.\nSi ascolta sui gradini.',
    startsAt: '2027-06-14T19:00:00Z',
    endsAt: '2027-06-14T22:00:00Z',
    venueName: 'Piazza Maggiore',
    address: 'Piazza Maggiore 1',
    city: 'Bologna',
    province: 'BO',
    latitude: 44.49,
    longitude: 11.34,
    maxParticipants: 300,
    participants: 3,
    status: 'PUBLISHED',
    owner: { id: OWNER_ID, firstName: 'Marco', lastName: 'Rinaldi', avatarUrl: null },
    images: [
      { id: 'i1', url: 'https://img.test/1.jpg', sortOrder: 0 },
      { id: 'i2', url: 'https://img.test/2.jpg', sortOrder: 1 },
    ],
    lineup: [
      { artistId: 'a1', artistName: 'Blue Trio', genre: 'Jazz', imageUrl: null, performanceOrder: 1, performanceStart: '2027-06-14T19:00:00Z', performanceEnd: '2027-06-14T20:15:00Z', posterUrl: 'https://img.test/p.jpg' },
      { artistId: 'a2', artistName: 'Luna Rossa Quartet', genre: null, imageUrl: null, performanceOrder: 2, performanceStart: null, performanceEnd: null, posterUrl: null },
    ],
    markers: [
      { id: 'm1', kind: 'ENTRANCE', label: 'Ingresso principale', latitude: 44.49, longitude: 11.34 },
      { id: 'm2', kind: 'EMERGENCY_EXIT', label: null, latitude: 44.49, longitude: 11.35 },
    ],
    createdAt: '2027-01-01T10:00:00Z',
    updatedAt: '2027-01-01T10:00:00Z',
    ...overrides,
  }
}

function setup(event: EventResponse | 404, me: { id: string; role: Role } | null = null) {
  server.use(
    http.get(`${API}/api/auth/me`, () => {
      if (me === null) {
        return new HttpResponse(null, { status: 401 })
      }
      const user: UserResponse = { id: me.id, email: 'x@test.it', firstName: 'Anna', lastName: 'Bianchi', role: me.role, avatarUrl: null }
      return HttpResponse.json(user)
    }),
    http.get(`${API}/api/events/:id`, () => {
      if (event === 404) {
        return HttpResponse.json({ status: 404, detail: 'Evento non trovato' }, { status: 404 })
      }
      return HttpResponse.json(event)
    }),
    // JoinButton e ParticipantsList (T4): chi e' loggato non e' iscritto e non ci sono partecipanti.
    http.get(`${API}/api/events/:id/tickets/me`, () => HttpResponse.json({ status: 404, detail: 'Non sei iscritto a questo evento' }, { status: 404 })),
    http.get(`${API}/api/events/:id/participants`, () => HttpResponse.json(EMPTY_PAGE)),
  )
}

describe('EventDetailPage', () => {
  it('mostra titolo, foto, descrizione, scaletta ordinata con orari, luogo e capienza', async () => {
    setup(detail())
    renderRoute('/events/e1')

    expect(await screen.findByRole('heading', { level: 1, name: 'Jazz sotto le stelle' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto di Jazz sotto le stelle' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto 2 di Jazz sotto le stelle' })).toBeInTheDocument()
    expect(screen.getByText(/Porta una coperta/)).toBeInTheDocument()

    const lineup = screen.getByRole('heading', { name: 'Scaletta' }).parentElement
    const items = within(lineup as HTMLElement).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Blue Trio'),
      expect.stringContaining('Luna Rossa Quartet'),
    ])
    expect(screen.getByText('21:00 - 22:15')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Blue Trio' })).toHaveAttribute('href', '/artists/a1')
    expect(screen.getByRole('img', { name: 'Locandina di Blue Trio' })).toBeInTheDocument()

    expect(screen.getByText('Piazza Maggiore', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('3 iscritti su 300 posti')).toBeInTheDocument()
    expect(screen.getByText('Marco Rinaldi')).toBeInTheDocument()
    expect(screen.getByTestId('map')).toHaveTextContent('2 marker')
  })

  it('anonimo: niente gestione e niente partecipanti; iscrizione sempre presente', async () => {
    setup(detail())
    renderRoute('/events/e1')

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByRole('link', { name: 'Accedi per iscriverti' })).toHaveAttribute('href', '/login')
    expect(screen.queryByText(/Gestione dell'evento/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Partecipanti' })).not.toBeInTheDocument()
  })

  it('proprietario e moderatore vedono la gestione; un altro utente no', async () => {
    setup(detail(), { id: OWNER_ID, role: 'USER' })
    const owner = renderRoute('/events/e1')
    expect(await screen.findByText(/Gestione dell'evento/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Partecipanti' })).toBeInTheDocument()
    owner.unmount()

    setup(detail(), { id: 'mod-1', role: 'MODERATOR' })
    const moderator = renderRoute('/events/e1')
    expect(await screen.findByText(/Gestione dell'evento/)).toBeInTheDocument()
    moderator.unmount()

    setup(detail(), { id: 'altro', role: 'USER' })
    renderRoute('/events/e1')
    await screen.findByRole('heading', { name: 'Partecipanti' })
    expect(screen.queryByText(/Gestione dell'evento/)).not.toBeInTheDocument()
  })

  it('evento annullato: avviso ed etichetta', async () => {
    setup(detail({ status: 'CANCELLED', maxParticipants: null, participants: 1 }))
    renderRoute('/events/e1')

    expect(await screen.findByRole('status')).toHaveTextContent('Evento annullato')
    expect(screen.getByText('Annullato')).toBeInTheDocument()
    expect(screen.getByText('1 iscritto, posti senza limite')).toBeInTheDocument()
  })

  it('posti esauriti', async () => {
    setup(detail({ maxParticipants: 3, participants: 3 }))
    renderRoute('/events/e1')

    expect(await screen.findByText('3 iscritti, posti esauriti')).toBeInTheDocument()
  })

  it('404: pagina "Evento non trovato" con ritorno alla lista', async () => {
    setup(404)
    renderRoute('/events/inesistente')

    expect(await screen.findByRole('heading', { name: 'Evento non trovato' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vedi gli altri eventi' })).toHaveAttribute('href', '/')
  })
})
