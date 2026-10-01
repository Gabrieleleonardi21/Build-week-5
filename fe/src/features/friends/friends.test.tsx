import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FriendRequestResponse, FriendResponse, Page, TicketResponse, UserResponse, UserSummaryResponse } from '@/lib/types'
import { API, EMPTY_PAGE, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const ME: UserResponse = { id: 'me', email: 'luca@test.it', firstName: 'Luca', lastName: 'Moretti', role: 'USER', avatarUrl: null }
const SARA: UserSummaryResponse = { id: 'u2', firstName: 'Sara', lastName: 'Colombo', avatarUrl: null }
const ELENA: UserSummaryResponse = { id: 'u3', firstName: 'Elena', lastName: 'Greco', avatarUrl: null }

const FRIEND: FriendResponse = { friendshipId: 'f1', friend: SARA, since: '2027-03-10T10:00:00Z', unreadMessages: 2 }
const REQUEST: FriendRequestResponse = { id: 'f2', user: ELENA, eventId: 'e1', eventTitle: 'Jazz sotto le stelle', createdAt: '2027-03-10T10:00:00Z' }

function page<T>(content: T[], totalPages = 1): Page<T> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages } }
}

// Utente loggato e liste vuote: ogni test sovrascrive solo quello che gli serve.
beforeEach(() => {
  server.use(
    http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
    http.get(`${API}/api/friendships`, () => HttpResponse.json(EMPTY_PAGE)),
    http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(EMPTY_PAGE)),
    http.get(`${API}/api/friendships/requests/sent`, () => HttpResponse.json(EMPTY_PAGE)),
  )
})

describe('FriendsPage: amici', () => {
  it('mostra gli amici con link alla chat e ai non letti', async () => {
    server.use(http.get(`${API}/api/friendships`, () => HttpResponse.json(page([FRIEND]))))
    renderRoute('/friends')

    expect(await screen.findByRole('link', { name: 'Sara Colombo' })).toHaveAttribute('href', '/users/u2')
    expect(within(screen.getByRole('list')).getByRole('link', { name: /Chat/ })).toHaveAttribute('href', '/chats/f1')
    expect(screen.getByLabelText('2 messaggi non letti')).toHaveTextContent('2')
    expect(screen.getByText('Amici dal 10 marzo 2027')).toBeInTheDocument()
  })

  it('vuoto: spiega come si diventa amici', async () => {
    renderRoute('/friends')

    expect(await screen.findByRole('heading', { name: 'Non hai ancora amici' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Scopri gli eventi' })).toHaveAttribute('href', '/')
  })

  it('"Rimuovi" chiede conferma, cancella l’amicizia e rilegge la lista', async () => {
    let deleted = ''
    server.use(
      http.get(`${API}/api/friendships`, () => HttpResponse.json(page([FRIEND]))),
      http.delete(`${API}/api/friendships/:id`, ({ params }) => {
        deleted = String(params.id)
        server.use(http.get(`${API}/api/friendships`, () => HttpResponse.json(EMPTY_PAGE)))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/friends')

    await userEvent.click(await screen.findByRole('button', { name: 'Rimuovi Sara Colombo dagli amici' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rimuovi' }))

    expect(await screen.findByRole('heading', { name: 'Non hai ancora amici' })).toBeInTheDocument()
    expect(deleted).toBe('f1')
  })

  it('errore: messaggio e "Riprova"', async () => {
    server.use(http.get(`${API}/api/friendships`, () => HttpResponse.json({ status: 503, detail: 'Servizio non disponibile' }, { status: 503 })))
    renderRoute('/friends')

    expect(await screen.findByRole('alert')).toHaveTextContent('Servizio non disponibile')
  })
})

describe('FriendsPage: richieste', () => {
  it('la scheda sta nell’URL e il badge conta le richieste in attesa', async () => {
    server.use(http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(page([REQUEST]))))
    const { router } = renderRoute('/friends')

    const tab = await screen.findByRole('tab', { name: /Richieste ricevute/ })
    expect(await within(tab).findByLabelText('1 richiesta in attesa')).toBeInTheDocument()
    await userEvent.click(tab)

    expect(router.state.location.search).toBe('?tab=ricevute')
    expect(await screen.findByRole('link', { name: 'Elena Greco' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jazz sotto le stelle' })).toHaveAttribute('href', '/events/e1')
  })

  it('accetta: POST e la richiesta sparisce', async () => {
    let accepted = ''
    server.use(
      http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(page([REQUEST]))),
      http.post(`${API}/api/friendships/:id/accept`, ({ params }) => {
        accepted = String(params.id)
        server.use(http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(EMPTY_PAGE)))
        return HttpResponse.json({ friendshipId: 'f2', friend: ELENA, since: '2027-03-11T10:00:00Z', unreadMessages: 0 })
      }),
    )
    renderRoute('/friends?tab=ricevute')

    await userEvent.click(await screen.findByRole('button', { name: 'Accetta la richiesta di Elena Greco' }))

    expect(await screen.findByRole('heading', { name: 'Nessuna richiesta in attesa' })).toBeInTheDocument()
    expect(accepted).toBe('f2')
  })

  it('rifiuta: POST e la richiesta sparisce', async () => {
    let rejected = ''
    server.use(
      http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(page([REQUEST]))),
      http.post(`${API}/api/friendships/:id/reject`, ({ params }) => {
        rejected = String(params.id)
        server.use(http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(EMPTY_PAGE)))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/friends?tab=ricevute')

    await userEvent.click(await screen.findByRole('button', { name: 'Rifiuta la richiesta di Elena Greco' }))

    expect(await screen.findByRole('heading', { name: 'Nessuna richiesta in attesa' })).toBeInTheDocument()
    expect(rejected).toBe('f2')
  })

  it('409 sull’accettazione (richiesta ritirata): la lista si rilegge comunque', async () => {
    server.use(
      http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(page([REQUEST]))),
      http.post(`${API}/api/friendships/:id/accept`, () => {
        server.use(http.get(`${API}/api/friendships/requests/received`, () => HttpResponse.json(EMPTY_PAGE)))
        return HttpResponse.json({ status: 409, detail: "La richiesta non e' piu' in attesa" }, { status: 409 })
      }),
    )
    renderRoute('/friends?tab=ricevute')

    await userEvent.click(await screen.findByRole('button', { name: 'Accetta la richiesta di Elena Greco' }))

    expect(await screen.findByRole('heading', { name: 'Nessuna richiesta in attesa' })).toBeInTheDocument()
  })

  it('inviate: "Ritira" cancella la richiesta; senza evento resta solo la data', async () => {
    let deleted = ''
    const sent: FriendRequestResponse = { ...REQUEST, id: 'f3', eventId: null, eventTitle: null }
    server.use(
      http.get(`${API}/api/friendships/requests/sent`, () => HttpResponse.json(page([sent]))),
      http.delete(`${API}/api/friendships/:id`, ({ params }) => {
        deleted = String(params.id)
        server.use(http.get(`${API}/api/friendships/requests/sent`, () => HttpResponse.json(EMPTY_PAGE)))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/friends?tab=inviate')

    expect(await screen.findByRole('link', { name: 'Elena Greco' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Jazz sotto le stelle' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ritira la richiesta a Elena Greco' }))

    expect(await screen.findByRole('heading', { name: 'Nessuna richiesta inviata' })).toBeInTheDocument()
    expect(deleted).toBe('f3')
  })

  it('una scheda sconosciuta nell’URL apre gli amici', async () => {
    renderRoute('/friends?tab=boh')

    expect(await screen.findByRole('tab', { name: 'I miei amici' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('FriendsPage: ricerca utenti', () => {
  it('meno di 2 caratteri: avviso, nessuna chiamata', async () => {
    let called = false
    server.use(
      http.get(`${API}/api/users`, () => {
        called = true
        return HttpResponse.json(EMPTY_PAGE)
      }),
    )
    renderRoute('/friends?tab=cerca')

    await userEvent.type(await screen.findByLabelText('Cerca una persona per nome o cognome'), 's')
    await userEvent.click(screen.getByRole('button', { name: 'Cerca' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Scrivi almeno 2 caratteri.')
    expect(called).toBe(false)
  })

  it('cerca: testo nell’URL e nella richiesta, risultati con link al profilo', async () => {
    let query = ''
    server.use(
      http.get(`${API}/api/users`, ({ request }) => {
        query = new URL(request.url).searchParams.get('q') ?? ''
        return HttpResponse.json(page([SARA]))
      }),
    )
    const { router } = renderRoute('/friends?tab=cerca')

    await userEvent.type(await screen.findByLabelText('Cerca una persona per nome o cognome'), 'sara')
    await userEvent.click(screen.getByRole('button', { name: 'Cerca' }))

    expect(await screen.findByRole('link', { name: 'Sara Colombo' })).toHaveAttribute('href', '/users/u2')
    expect(query).toBe('sara')
    expect(router.state.location.search).toBe('?tab=cerca&q=sara')
    expect(screen.getByText(/Si diventa amici tra partecipanti dello stesso evento/)).toBeInTheDocument()
  })

  it('nessun risultato', async () => {
    server.use(http.get(`${API}/api/users`, () => HttpResponse.json(EMPTY_PAGE)))
    renderRoute('/friends?tab=cerca&q=zzz')

    expect(await screen.findByRole('heading', { name: 'Nessun utente trovato' })).toBeInTheDocument()
  })

  it('cambiando scheda la ricerca esce dall’URL', async () => {
    server.use(http.get(`${API}/api/users`, () => HttpResponse.json(page([SARA]))))
    const { router } = renderRoute('/friends?tab=cerca&q=sara')

    await userEvent.click(await screen.findByRole('tab', { name: 'Richieste inviate' }))

    await waitFor(() => expect(router.state.location.search).toBe('?tab=inviate'))
  })
})

describe('UserProfilePage', () => {
  it('mostra nome e avatar', async () => {
    server.use(http.get(`${API}/api/users/u2`, () => HttpResponse.json(SARA)))
    renderRoute('/users/u2')

    expect(await screen.findByRole('heading', { level: 1, name: 'Sara Colombo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Amici' })).toHaveAttribute('href', '/friends')
  })

  it('404: "Utente non trovato"', async () => {
    server.use(http.get(`${API}/api/users/:id`, () => HttpResponse.json({ status: 404, detail: 'Utente non trovato' }, { status: 404 })))
    renderRoute('/users/x')

    expect(await screen.findByRole('heading', { name: 'Utente non trovato' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai ai tuoi amici' })).toHaveAttribute('href', '/friends')
  })
})

describe('Aggiungi agli amici dalla ricerca', () => {
  const MY_TICKET: TicketResponse = {
    id: 't1',
    code: 'EVT-7K3M9QA2',
    status: 'VALID',
    issuedAt: '2027-01-02T10:00:00Z',
    event: {
      id: 'e1',
      title: 'Jazz sotto le stelle',
      startsAt: '2027-06-10T19:00:00Z',
      endsAt: null,
      venueName: null,
      city: 'Milano',
      province: 'MI',
      latitude: 45.46,
      longitude: 9.19,
      status: 'PUBLISHED',
      coverUrl: null,
    },
  }

  beforeEach(() => {
    server.use(
      http.get(`${API}/api/users`, () => HttpResponse.json(page([SARA]))),
      http.get(`${API}/api/me/tickets`, () => HttpResponse.json(page([MY_TICKET]))),
    )
  })

  it('si sceglie l’evento in comune e parte la richiesta', async () => {
    let body: unknown = null
    server.use(
      http.post(`${API}/api/friendships`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'f9', user: SARA, eventId: 'e1', eventTitle: 'Jazz sotto le stelle', createdAt: '2027-03-10T10:00:00Z' }, { status: 201 })
      }),
    )
    renderRoute('/friends?tab=cerca&q=sara')

    await userEvent.click(await screen.findByRole('button', { name: 'Aggiungi agli amici' }))
    expect(await screen.findByRole('combobox', { name: 'A quale evento andate insieme?' })).toHaveValue('e1')
    await userEvent.click(screen.getByRole('button', { name: 'Invia richiesta a Sara' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Richiesta inviata a Sara')
    expect(body).toEqual({ addresseeId: 'u2', eventId: 'e1' })
  })

  it('403: spiega che l’altra persona non partecipa a quell’evento', async () => {
    server.use(
      http.post(`${API}/api/friendships`, () => HttpResponse.json({ detail: 'Non partecipate allo stesso evento' }, { status: 403 })),
    )
    renderRoute('/friends?tab=cerca&q=sara')

    await userEvent.click(await screen.findByRole('button', { name: 'Aggiungi agli amici' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Invia richiesta a Sara' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sara non risulta tra i partecipanti di questo evento')
  })
})
