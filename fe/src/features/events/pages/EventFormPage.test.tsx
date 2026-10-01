import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { fromLocalInputValue } from '@/lib/format'
import type { EventRequest, EventResponse, Role, UserResponse } from '@/lib/types'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import type { PickerMarker } from '../components/form/LocationPicker'

// La mappa (Leaflet) in jsdom non serve: un bottone simula il clic su un punto.
vi.mock('../components/form/LocationPicker', () => ({
  LocationPicker: ({ markers, onPick }: { markers: readonly PickerMarker[]; onPick: (lat: number, lng: number) => void }) => (
    <div data-testid="map">
      <button type="button" onClick={() => onPick(45.4642, 9.19)}>
        clic sulla mappa
      </button>
      <span>{markers.length} marker sulla mappa</span>
    </div>
  ),
}))

const OWNER_ID = 'owner-1'

function detail(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'e1',
    title: 'Jazz sotto le stelle',
    description: 'Porta una coperta.',
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
    owner: { id: OWNER_ID, firstName: 'Marco', lastName: 'Rinaldi', avatarUrl: null },
    images: [
      { id: 'i1', url: 'https://img.test/1.jpg', sortOrder: 0 },
      { id: 'i2', url: 'https://img.test/2.jpg', sortOrder: 1 },
    ],
    lineup: [
      { artistId: 'a1', artistName: 'Blue Trio', genre: 'Jazz', imageUrl: null, performanceOrder: 1, performanceStart: null, performanceEnd: null, posterUrl: 'https://img.test/p.jpg' },
    ],
    markers: [{ id: 'm1', kind: 'ENTRANCE', label: 'Ingresso principale', latitude: 44.49, longitude: 11.34 }],
    createdAt: '2027-01-01T10:00:00Z',
    updatedAt: '2027-01-01T10:00:00Z',
    ...overrides,
  }
}

function login(id: string = OWNER_ID, role: Role = 'USER') {
  const user: UserResponse = { id, email: 'x@test.it', firstName: 'Marco', lastName: 'Rinaldi', role, avatarUrl: null }
  server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json(user)))
}

function serveEvent(event: EventResponse) {
  server.use(http.get(`${API}/api/events/:id`, () => HttpResponse.json(event)))
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Titolo'), 'Notte rock')
  // datetime-local: in jsdom si imposta il valore direttamente, come fa il selettore del browser.
  fireEvent.change(screen.getByLabelText('Inizio'), { target: { value: '2099-07-01T21:00' } })
  await user.type(screen.getByLabelText('Indirizzo'), 'Via Larga 1')
  await user.type(screen.getByLabelText('Città'), 'Milano')
  await user.click(screen.getByRole('button', { name: 'clic sulla mappa' }))
}

describe('EventCreatePage', () => {
  it('crea l\'evento con luogo dalla mappa, scaletta e marker, poi apre la modifica per le foto', async () => {
    login()
    let body: EventRequest | undefined
    server.use(
      http.post(`${API}/api/events`, async ({ request }) => {
        body = (await request.json()) as EventRequest
        return HttpResponse.json(detail({ id: 'nuovo', title: 'Notte rock', images: [], lineup: [], markers: [] }), { status: 201 })
      }),
    )
    serveEvent(detail({ id: 'nuovo', title: 'Notte rock', images: [], lineup: [], markers: [] }))
    const user = userEvent.setup({ delay: null })
    const { router } = renderRoute('/events/new')

    await fillRequired(user)
    expect(screen.getByLabelText('Latitudine')).toHaveValue('45.464200')
    await user.type(screen.getByLabelText('Provincia'), 'mi')
    await user.type(screen.getByLabelText('Posti disponibili'), '120')

    await user.click(screen.getByRole('button', { name: 'Aggiungi artista' }))
    await user.type(screen.getByLabelText('Artista'), 'The Amps')

    // Cambiando modalita' il clic sulla mappa aggiunge un marker di quel tipo.
    await user.click(screen.getByRole('button', { name: 'Uscita di emergenza' }))
    await user.click(screen.getByRole('button', { name: 'clic sulla mappa' }))
    expect(screen.getByText('1 marker sulla mappa')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Etichetta'), 'Lato nord')

    await user.click(screen.getByRole('button', { name: 'Crea evento' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/events/nuovo/edit'))
    expect(body).toEqual({
      title: 'Notte rock',
      description: null,
      startsAt: fromLocalInputValue('2099-07-01T21:00'),
      endsAt: null,
      venueName: null,
      address: 'Via Larga 1',
      city: 'Milano',
      province: 'MI',
      latitude: 45.4642,
      longitude: 9.19,
      maxParticipants: 120,
      lineup: [{ artistName: 'The Amps', performanceStart: null, performanceEnd: null }],
      markers: [{ kind: 'EMERGENCY_EXIT', label: 'Lato nord', latitude: 45.4642, longitude: 9.19 }],
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Modifica evento' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Foto' })).toBeInTheDocument()
  })

  it('form vuoto: errori sotto i campi e nessuna chiamata', async () => {
    login()
    let called = false
    server.use(
      http.post(`${API}/api/events`, () => {
        called = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/new')

    await user.click(await screen.findByRole('button', { name: 'Crea evento' }))

    expect(await screen.findByText('Inserisci il titolo')).toBeInTheDocument()
    expect(screen.getByText('Inserisci data e ora di inizio')).toBeInTheDocument()
    expect(screen.getByText("Inserisci l'indirizzo")).toBeInTheDocument()
    expect(screen.getByText(/Scegli il punto sulla mappa o scrivi una latitudine/)).toBeInTheDocument()
    expect(screen.getByLabelText('Titolo')).toHaveAttribute('aria-invalid', 'true')
    expect(called).toBe(false)
  })

  it('errori del backend: quelli di campo sotto il campo (anche in scaletta), gli altri in cima', async () => {
    login()
    let response = HttpResponse.json(
      { status: 400, detail: 'Dati non validi', errors: { province: "La provincia e' una sigla di 2 lettere", 'lineup[0].artistName': 'Nome non ammesso' } },
      { status: 400 },
    )
    server.use(http.post(`${API}/api/events`, () => response))
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/new')

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Aggiungi artista' }))
    await user.type(screen.getByLabelText('Artista'), 'The Amps')
    await user.click(screen.getByRole('button', { name: 'Crea evento' }))

    expect(await screen.findByText("La provincia e' una sigla di 2 lettere")).toBeInTheDocument()
    expect(screen.getByText('Nome non ammesso')).toBeInTheDocument()

    response = HttpResponse.json({ status: 400, detail: 'La data di inizio deve essere nel futuro' }, { status: 400 })
    await user.click(screen.getByRole('button', { name: 'Crea evento' }))
    expect(await screen.findByText('La data di inizio deve essere nel futuro')).toBeInTheDocument()
  })

  it('scaletta: si aggiunge, si riordina e si toglie', async () => {
    login()
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/new')

    await user.click(await screen.findByRole('button', { name: 'Aggiungi artista' }))
    await user.click(screen.getByRole('button', { name: 'Aggiungi artista' }))
    const names = screen.getAllByLabelText('Artista')
    await user.type(names[0] as HTMLElement, 'Primo')
    await user.type(names[1] as HTMLElement, 'Secondo')

    await user.click(screen.getByRole('button', { name: 'Sposta su Secondo' }))
    expect(screen.getAllByLabelText('Artista').map((input) => (input as HTMLInputElement).value)).toEqual(['Secondo', 'Primo'])

    await user.click(screen.getByRole('button', { name: 'Togli Secondo dalla scaletta' }))
    expect(screen.getAllByLabelText('Artista').map((input) => (input as HTMLInputElement).value)).toEqual(['Primo'])
  })
})

describe('EventEditPage', () => {
  it('precompila il form e salva con PUT lasciando intatto l\'inizio non toccato', async () => {
    login()
    serveEvent(detail())
    let body: EventRequest | undefined
    server.use(
      http.put(`${API}/api/events/e1`, async ({ request }) => {
        body = (await request.json()) as EventRequest
        return HttpResponse.json(detail({ title: 'Jazz in piazza' }))
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/e1/edit')

    const title = await screen.findByLabelText('Titolo')
    expect(title).toHaveValue('Jazz sotto le stelle')
    expect(screen.getByLabelText('Descrizione')).toHaveValue('Porta una coperta.')
    expect(screen.getByLabelText('Artista')).toHaveValue('Blue Trio')
    expect(screen.getByLabelText('Etichetta')).toHaveValue('Ingresso principale')
    expect(screen.getByText('1 marker sulla mappa')).toBeInTheDocument()

    await user.clear(title)
    await user.type(title, 'Jazz in piazza')
    await user.click(screen.getByRole('button', { name: 'Salva le modifiche' }))

    await waitFor(() => expect(body).toBeDefined())
    expect(body).toMatchObject({
      title: 'Jazz in piazza',
      startsAt: '2099-06-14T19:00:00Z',
      province: 'BO',
      latitude: 44.49,
      maxParticipants: 300,
      lineup: [{ artistName: 'Blue Trio', performanceStart: null, performanceEnd: null }],
      markers: [{ kind: 'ENTRANCE', label: 'Ingresso principale', latitude: 44.49, longitude: 11.34 }],
    })
  })

  it('capienza sotto gli iscritti: il messaggio del backend compare nel form', async () => {
    login()
    serveEvent(detail())
    server.use(
      http.put(`${API}/api/events/e1`, () =>
        HttpResponse.json({ status: 400, detail: "La capienza non puo' essere inferiore ai 3 partecipanti gia' iscritti" }, { status: 400 }),
      ),
    )
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/e1/edit')

    const seats = await screen.findByLabelText('Posti disponibili')
    await user.clear(seats)
    await user.type(seats, '2')
    await user.click(screen.getByRole('button', { name: 'Salva le modifiche' }))

    expect(await screen.findByText(/La capienza non puo' essere inferiore ai 3/)).toBeInTheDocument()
  })

  it('chi non e\' proprietario non vede il form; un moderatore si\'', async () => {
    login('altro')
    serveEvent(detail())
    const other = renderRoute('/events/e1/edit')
    expect(await screen.findByRole('heading', { name: 'Non puoi modificare questo evento' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Titolo')).not.toBeInTheDocument()
    other.unmount()

    login('mod-1', 'MODERATOR')
    renderRoute('/events/e1/edit')
    expect(await screen.findByLabelText('Titolo')).toHaveValue('Jazz sotto le stelle')
  })

  it('evento annullato: avviso, campi spenti, niente foto ne\' AI', async () => {
    login()
    serveEvent(detail({ status: 'CANCELLED' }))
    renderRoute('/events/e1/edit')

    expect(await screen.findByRole('status')).toHaveTextContent('Evento annullato')
    expect(screen.getByLabelText('Titolo')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salva le modifiche' })).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'Foto' })).not.toBeInTheDocument()
  })

  it('404: evento non trovato', async () => {
    login()
    server.use(http.get(`${API}/api/events/:id`, () => HttpResponse.json({ status: 404, detail: 'Evento non trovato' }, { status: 404 })))
    renderRoute('/events/boh/edit')

    expect(await screen.findByRole('heading', { name: 'Evento non trovato' })).toBeInTheDocument()
  })

  it('toglie una foto dopo la conferma e ricarica l\'evento', async () => {
    login()
    let current = detail()
    server.use(http.get(`${API}/api/events/:id`, () => HttpResponse.json(current)))
    let deleted = ''
    server.use(
      http.delete(`${API}/api/events/e1/images/:imageId`, ({ params }) => {
        deleted = String(params.imageId)
        current = detail({ images: [{ id: 'i2', url: 'https://img.test/2.jpg', sortOrder: 0 }] })
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/e1/edit')

    expect(await screen.findByText('2 di 10', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Togli la foto 1' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Togli la foto' }))

    await waitFor(() => expect(deleted).toBe('i1'))
    expect(await screen.findByText('1 di 10', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Togli la foto 2' })).not.toBeInTheDocument()
  })

  it('foto: un file non ammesso viene rifiutato con il motivo, senza partire', async () => {
    login()
    serveEvent(detail())
    // applyAccept false: si simula chi trascina un file che il selettore avrebbe nascosto.
    const user = userEvent.setup({ delay: null, applyAccept: false })
    renderRoute('/events/e1/edit')

    const input = await screen.findByLabelText('Aggiungi foto')
    await user.upload(input, new File(['ciao'], 'note.txt', { type: 'text/plain' }))

    expect(await screen.findByText('note.txt: formati ammessi JPEG, PNG o WebP')).toBeInTheDocument()
    expect(screen.queryByText(/in caricamento/)).not.toBeInTheDocument()
  })

  it('locandine: mostra quella salvata e la toglie', async () => {
    login()
    serveEvent(detail())
    let deleted = false
    server.use(
      http.delete(`${API}/api/events/e1/lineup/a1/poster`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/e1/edit')

    expect(await screen.findByRole('img', { name: 'Locandina di Blue Trio' })).toBeInTheDocument()
    expect(screen.getByLabelText('Sostituisci la locandina di Blue Trio')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Togli la locandina di Blue Trio' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Togli la locandina' }))
    await waitFor(() => expect(deleted).toBe(true))
  })

  it('AI: manda la bozza, mostra la proposta come testo e "Usa questa" la mette nel campo', async () => {
    login()
    serveEvent(detail())
    let sent: unknown
    server.use(
      http.post(`${API}/api/events/e1/ai-description`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ proposal: 'Una serata <b>magica</b> in piazza.' })
      }),
    )
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/e1/edit')

    await user.click(await screen.findByRole('button', { name: 'Migliora con AI' }))

    const proposal = await screen.findByRole('region', { name: "Proposta dell'AI" })
    // I tag restano testo: nessun elemento <b> creato dalla risposta.
    expect(within(proposal).getByText('Una serata <b>magica</b> in piazza.')).toBeInTheDocument()
    expect(sent).toEqual({ text: 'Porta una coperta.' })

    await user.click(within(proposal).getByRole('button', { name: 'Usa questa' }))
    expect(screen.getByLabelText('Descrizione')).toHaveValue('Una serata <b>magica</b> in piazza.')
    expect(screen.queryByRole('region', { name: "Proposta dell'AI" })).not.toBeInTheDocument()
  })

  it('AI: 503 mostra il messaggio e "Riprova"; 429 fa aspettare', async () => {
    login()
    serveEvent(detail())
    let response = HttpResponse.json({ status: 503, detail: 'Servizio AI non disponibile, riprova tra poco' }, { status: 503 })
    server.use(http.post(`${API}/api/events/e1/ai-description`, () => response))
    const user = userEvent.setup({ delay: null })
    renderRoute('/events/e1/edit')

    await user.click(await screen.findByRole('button', { name: 'Migliora con AI' }))
    expect(await screen.findByText('Servizio AI non disponibile, riprova tra poco')).toBeInTheDocument()

    response = HttpResponse.json({ status: 429, detail: 'Troppe richieste' }, { status: 429, headers: { 'Retry-After': '900' } })
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByText('Hai chiesto molte proposte. Riprova tra 15 minuti.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Riprova tra 15 minuti/ })).toBeDisabled()
  })
})
