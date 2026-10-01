import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { EventPinResponse } from '@/lib/types'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

// Leaflet non serve in jsdom: la mappa finta mostra quali pin riceve e quale e' selezionato.
vi.mock('../components/EventsMapView', () => ({
  EventsMapView: ({ pins, selectedId }: { pins: EventPinResponse[]; selectedId: string | null }) => (
    <div data-testid="map">
      {pins.length} pin, selezionato: {selectedId ?? 'nessuno'}
    </div>
  ),
}))

const PINS: EventPinResponse[] = [
  { id: 'p1', title: 'Jazz sotto le stelle', startsAt: '2027-06-14T19:00:00Z', city: 'Bologna', latitude: 44.49, longitude: 11.34 },
  { id: 'p2', title: 'Vivaldi in piazza', startsAt: '2027-06-20T19:00:00Z', city: 'Milano', latitude: 45.46, longitude: 9.19 },
]

function pinsApi(respond: (url: URL) => EventPinResponse[]) {
  const calls: URL[] = []
  server.use(
    http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
    http.get(`${API}/api/events/map`, ({ request }) => {
      const url = new URL(request.url)
      calls.push(url)
      return HttpResponse.json(respond(url))
    }),
  )
  return calls
}

describe('EventsMapPage', () => {
  it('mostra i pin sulla mappa e l\'elenco; cliccando un evento lo seleziona', async () => {
    pinsApi(() => PINS)
    renderRoute('/map')

    expect(await screen.findByTestId('map')).toHaveTextContent('2 pin, selezionato: nessuno')
    expect(screen.getByText('2 eventi sulla mappa')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: /Vivaldi in piazza/ }))

    expect(screen.getByTestId('map')).toHaveTextContent('selezionato: p2')
    expect(screen.getByRole('button', { name: /Vivaldi in piazza/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('i filtri vanno nell\'URL e nella richiesta /api/events/map', async () => {
    const calls = pinsApi((url) => PINS.filter((pin) => pin.city === (url.searchParams.get('city') ?? pin.city)))
    const { router } = renderRoute('/map')
    await screen.findByTestId('map')

    await userEvent.setup().type(screen.getByLabelText('Città'), 'Milano')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerca' }))

    await waitFor(() => expect(router.state.location.search).toBe('?city=Milano'))
    await waitFor(() => expect(screen.getByTestId('map')).toHaveTextContent('1 pin'))
    expect(calls.at(-1)?.searchParams.get('city')).toBe('Milano')
    expect(screen.getByText('1 evento sulla mappa')).toBeInTheDocument()
  })

  it('nessun evento: stato vuoto al posto della mappa', async () => {
    pinsApi(() => [])
    renderRoute('/map?q=zzz')

    expect(await screen.findByRole('heading', { name: 'Nessun evento da mostrare' })).toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('la voce Mappa del menu porta alla pagina', async () => {
    pinsApi(() => PINS)
    const { router } = renderRoute('/')

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Mappa' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/map'))
    expect(await screen.findByRole('heading', { name: 'Mappa degli eventi' })).toBeInTheDocument()
  })
})
