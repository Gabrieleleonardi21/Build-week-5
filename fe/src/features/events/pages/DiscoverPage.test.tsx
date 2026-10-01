import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { EventSummaryResponse } from '@/lib/types'
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
    coverUrl: `https://img.test/${id}.jpg`,
    ...overrides,
  }
}

function page(content: EventSummaryResponse[], number = 0, totalPages = 1) {
  return { content, page: { size: 12, number, totalElements: content.length + number * 12, totalPages } }
}

/** Backend finto che registra i parametri ricevuti. */
function eventsApi(respond: (url: URL) => ReturnType<typeof page>) {
  const calls: URL[] = []
  server.use(
    http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
    http.get(`${API}/api/events`, ({ request }) => {
      const url = new URL(request.url)
      calls.push(url)
      return HttpResponse.json(respond(url))
    }),
  )
  return calls
}

describe('DiscoverPage', () => {
  it('mostra le card con link al dettaglio, data italiana e luogo; la prima foto va nell\'hero', async () => {
    eventsApi(() => page([event('e1', 'Jazz sotto le stelle'), event('e2', 'Folk al Plebiscito', { venueName: null, city: 'Napoli' })]))
    renderRoute('/')

    const cards = await screen.findAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]!).getByRole('link', { name: 'Jazz sotto le stelle' })).toHaveAttribute('href', '/events/e1')
    expect(within(cards[0]!).getByText(/21:00/)).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Napoli')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto di Jazz sotto le stelle' })).toBeInTheDocument()
    expect(screen.getByText('2 eventi')).toBeInTheDocument()
  })

  it('la ricerca va nell\'URL e nella richiesta al backend, e torna alla prima pagina', async () => {
    const calls = eventsApi(() => page([event('e1', 'Jazz sotto le stelle')]))
    const { router } = renderRoute('/?page=3')
    await screen.findByRole('article')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Cosa cerchi'), 'jazz')
    await user.type(screen.getByLabelText('Città'), ' Bologna ')
    await user.click(screen.getByRole('button', { name: 'Cerca' }))

    await vi.waitFor(() => expect(router.state.location.search).toBe('?q=jazz&city=Bologna'))
    const last = calls.at(-1)
    expect(last?.searchParams.get('q')).toBe('jazz')
    expect(last?.searchParams.get('city')).toBe('Bologna')
    expect(last?.searchParams.get('page')).toBe('0')
  })

  it('nessun risultato: stato vuoto con Cancella filtri che svuota l\'URL', async () => {
    eventsApi(() => page([]))
    const { router } = renderRoute('/?q=inesistente')

    expect(await screen.findByRole('heading', { name: 'Nessun evento trovato' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cancella filtri' })).toHaveLength(1)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancella filtri' }))

    await vi.waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('paginazione: ?page=2 chiede la pagina 1 al backend e Successiva va avanti', async () => {
    const calls = eventsApi((url) => page([event('e13', 'Evento 13')], Number(url.searchParams.get('page')), 3))
    const { router } = renderRoute('/?page=2')

    expect(await screen.findByText('Pagina 2 di 3')).toBeInTheDocument()
    expect(calls[0]?.searchParams.get('page')).toBe('1')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Successiva' }))

    await vi.waitFor(() => expect(router.state.location.search).toBe('?page=3'))
  })

  it('errore del backend: messaggio e Riprova', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
      http.get(`${API}/api/events`, () => HttpResponse.json({ status: 503, detail: 'Servizio in avvio' }, { status: 503 })),
    )
    renderRoute('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Servizio in avvio')
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })

  it('evento senza foto: segnaposto al posto dell\'immagine, niente hero', async () => {
    eventsApi(() => page([event('e1', 'Senza foto', { coverUrl: null })]))
    renderRoute('/')

    await screen.findByRole('article')
    expect(screen.queryByRole('img', { name: /Foto di/ })).not.toBeInTheDocument()
  })
})
