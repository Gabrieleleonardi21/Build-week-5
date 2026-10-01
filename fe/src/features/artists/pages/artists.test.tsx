import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import type { ArtistResponse, Role, UserResponse } from '@/lib/types'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

// Il Toaster non e' montato nei test: si controlla che il toast venga chiesto col messaggio giusto.
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

function artist(id: string, name: string, overrides: Partial<ArtistResponse> = {}): ArtistResponse {
  return { id, name, genre: 'Jazz', bio: 'Trio nato a Bologna.\nSuona dal 2015.', imageUrl: `https://img.test/${id}.jpg`, ...overrides }
}

function page(content: ArtistResponse[], number = 0, totalPages = 1) {
  return { content, page: { size: 12, number, totalElements: content.length + number * 12, totalPages } }
}

function session(role: Role | null) {
  server.use(
    http.get(`${API}/api/auth/me`, () => {
      if (role === null) {
        return new HttpResponse(null, { status: 401 })
      }
      const user: UserResponse = { id: 'u1', email: 'x@test.it', firstName: 'Anna', lastName: 'Bianchi', role, avatarUrl: null }
      return HttpResponse.json(user)
    }),
  )
}

/** Lista finta che registra i parametri ricevuti. */
function artistsApi(respond: (url: URL) => ReturnType<typeof page>) {
  const calls: URL[] = []
  server.use(
    http.get(`${API}/api/artists`, ({ request }) => {
      const url = new URL(request.url)
      calls.push(url)
      return HttpResponse.json(respond(url))
    }),
  )
  return calls
}

describe('ArtistsPage', () => {
  it('mostra gli artisti con link al dettaglio, genere e conteggio; anonimo senza "Nuovo artista"', async () => {
    session(null)
    artistsApi(() => page([artist('a1', 'Blue Trio'), artist('a2', 'Luna Rossa', { genre: null, imageUrl: null })]))
    renderRoute('/artists')

    expect(await screen.findByRole('link', { name: 'Blue Trio' })).toHaveAttribute('href', '/artists/a1')
    expect(screen.getByRole('link', { name: 'Luna Rossa' })).toHaveAttribute('href', '/artists/a2')
    expect(screen.getByText('Jazz')).toBeInTheDocument()
    expect(screen.getByText('2 artisti')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuovo artista' })).not.toBeInTheDocument()
  })

  it('la ricerca va nell\'URL e nella richiesta, e torna alla prima pagina', async () => {
    session(null)
    const calls = artistsApi(() => page([artist('a1', 'Blue Trio')]))
    const { router } = renderRoute('/artists?page=2')
    await screen.findByRole('link', { name: 'Blue Trio' })
    expect(calls.at(-1)?.searchParams.get('page')).toBe('1')

    const user = userEvent.setup()
    await user.type(screen.getByLabelText("Nome dell'artista"), 'blue')
    await user.click(screen.getByRole('button', { name: 'Cerca' }))

    await waitFor(() => expect(calls.at(-1)?.searchParams.get('q')).toBe('blue'))
    expect(calls.at(-1)?.searchParams.get('page')).toBe('0')
    expect(router.state.location.search).toBe('?q=blue')
  })

  it('paginazione: "Successiva" chiede la pagina dopo', async () => {
    session(null)
    const calls = artistsApi((url) => page([artist('a1', 'Blue Trio')], Number(url.searchParams.get('page')), 3))
    renderRoute('/artists')
    await screen.findByText('Pagina 1 di 3')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Successiva' }))

    expect(await screen.findByText('Pagina 2 di 3')).toBeInTheDocument()
    expect(calls.at(-1)?.searchParams.get('page')).toBe('1')
  })

  it('nessun risultato: stato vuoto', async () => {
    session(null)
    artistsApi(() => page([]))
    renderRoute('/artists?q=zzz')

    expect(await screen.findByRole('heading', { name: 'Nessun artista trovato' })).toBeInTheDocument()
    expect(screen.getByText(/cancella la ricerca/)).toBeInTheDocument()
  })

  it('errore del server: messaggio e Riprova', async () => {
    session(null)
    let fail = true
    server.use(
      http.get(`${API}/api/artists`, () => {
        if (fail) {
          return HttpResponse.json({ status: 503, detail: 'Servizio non disponibile' }, { status: 503 })
        }
        return HttpResponse.json(page([artist('a1', 'Blue Trio')]))
      }),
    )
    renderRoute('/artists')

    expect(await screen.findByRole('alert')).toHaveTextContent('Servizio non disponibile')
    fail = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByRole('link', { name: 'Blue Trio' })).toBeInTheDocument()
  })

  it('utente loggato: crea un artista (vuoti -> null) e arriva al suo dettaglio', async () => {
    session('USER')
    artistsApi(() => page([]))
    let body: unknown
    server.use(
      http.post(`${API}/api/artists`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(artist('a9', 'Nuova Onda', { genre: null, bio: null, imageUrl: null }), { status: 201 })
      }),
      // Arrivati sul dettaglio la pagina rilegge l'artista appena creato.
      http.get(`${API}/api/artists/a9`, () => HttpResponse.json(artist('a9', 'Nuova Onda', { genre: null, bio: null, imageUrl: null }))),
    )
    const { router } = renderRoute('/artists')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nuovo artista' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Nome'), ' Nuova Onda ')
    await user.click(within(dialog).getByRole('button', { name: 'Crea artista' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/artists/a9'))
    expect(body).toEqual({ name: 'Nuova Onda', genre: null, bio: null, imageUrl: null })
    expect(await screen.findByRole('heading', { level: 1, name: 'Nuova Onda' })).toBeInTheDocument()
  })

  it('validazione e 409: errori sotto i campi, il dialog resta aperto', async () => {
    session('USER')
    artistsApi(() => page([]))
    server.use(http.post(`${API}/api/artists`, () => HttpResponse.json({ status: 409, detail: "Artista gia' presente" }, { status: 409 })))
    renderRoute('/artists')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Nuovo artista' }))
    const dialog = await screen.findByRole('dialog')

    await user.type(within(dialog).getByLabelText(/Link a un'immagine/), 'javascript:alert(1)')
    await user.click(within(dialog).getByRole('button', { name: 'Crea artista' }))
    expect(await within(dialog).findByText('Inserisci il nome')).toBeInTheDocument()
    expect(within(dialog).getByText(/http:\/\/ o https:\/\//, { selector: '[role="alert"]' })).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText(/Link a un'immagine/))
    await user.type(within(dialog).getByLabelText('Nome'), 'Blue Trio')
    await user.click(within(dialog).getByRole('button', { name: 'Crea artista' }))
    expect(await within(dialog).findByText('Esiste già un artista con questo nome.')).toBeInTheDocument()
  })
})

describe('ArtistDetailPage', () => {
  function detailApi(response: ArtistResponse | 404) {
    server.use(
      http.get(`${API}/api/artists/:id`, () => {
        if (response === 404) {
          return HttpResponse.json({ status: 404, detail: 'Artista non trovato' }, { status: 404 })
        }
        return HttpResponse.json(response)
      }),
    )
  }

  it('mostra nome, genere, bio e foto; un utente normale non vede la moderazione', async () => {
    session('USER')
    detailApi(artist('a1', 'Blue Trio'))
    renderRoute('/artists/a1')

    expect(await screen.findByRole('heading', { level: 1, name: 'Blue Trio' })).toBeInTheDocument()
    expect(screen.getByText('Jazz')).toBeInTheDocument()
    expect(screen.getByText(/Trio nato a Bologna/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto di Blue Trio' })).toHaveAttribute('src', 'https://img.test/a1.jpg')
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancella' })).not.toBeInTheDocument()
  })

  it('senza bio e con un link non http: segnaposto, mai il link in src', async () => {
    session(null)
    detailApi(artist('a1', 'Blue Trio', { bio: null, imageUrl: 'javascript:alert(1)' }))
    renderRoute('/artists/a1')

    expect(await screen.findByText('Nessuna biografia disponibile.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Foto di Blue Trio' })).not.toBeInTheDocument()
  })

  it('404: "Artista non trovato" con ritorno all\'elenco', async () => {
    session(null)
    detailApi(404)
    renderRoute('/artists/inesistente')

    expect(await screen.findByRole('heading', { name: 'Artista non trovato' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vedi tutti gli artisti' })).toHaveAttribute('href', '/artists')
  })

  it('moderatore: modifica con PUT e la pagina mostra i nuovi dati', async () => {
    session('MODERATOR')
    detailApi(artist('a1', 'Blue Trio'))
    let body: unknown
    server.use(
      http.put(`${API}/api/artists/a1`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(artist('a1', 'Blue Trio', { genre: 'Swing' }))
      }),
    )
    renderRoute('/artists/a1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    const dialog = await screen.findByRole('dialog')
    const genre = within(dialog).getByLabelText(/Genere/)
    expect(genre).toHaveValue('Jazz')
    await user.clear(genre)
    await user.type(genre, 'Swing')
    await user.click(within(dialog).getByRole('button', { name: 'Salva modifiche' }))

    expect(await screen.findByText('Swing')).toBeInTheDocument()
    expect(body).toMatchObject({ name: 'Blue Trio', genre: 'Swing' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('moderatore: cancella e torna all\'elenco', async () => {
    session('MODERATOR')
    detailApi(artist('a1', 'Blue Trio'))
    artistsApi(() => page([]))
    server.use(http.delete(`${API}/api/artists/a1`, () => new HttpResponse(null, { status: 204 })))
    const { router } = renderRoute('/artists/a1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Cancella' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancella artista' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/artists'))
    expect(toast.success).toHaveBeenCalledWith('Blue Trio cancellato')
  })

  it('cancellazione con 409: spiega che e\' in una scaletta e resta sulla pagina', async () => {
    session('SUPERADMIN')
    detailApi(artist('a1', 'Blue Trio'))
    server.use(http.delete(`${API}/api/artists/a1`, () => HttpResponse.json({ status: 409, detail: 'in scaletta' }, { status: 409 })))
    const { router } = renderRoute('/artists/a1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Cancella' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancella artista' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('è nella scaletta di almeno un evento')))
    expect(router.state.location.pathname).toBe('/artists/a1')
  })
})
