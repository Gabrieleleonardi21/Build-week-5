import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ChatMessageResponse, ChatSummaryResponse, FriendResponse, UserResponse, UserSummaryResponse } from '@/lib/types'
import { fakeRealtime } from '@/test/fake-stomp'
import { API, EMPTY_PAGE, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

const ME: UserResponse = { id: 'u1', email: 'luca@mail.it', firstName: 'Luca', lastName: 'Moretti', role: 'USER', avatarUrl: null }
const SARA: UserSummaryResponse = { id: 'u2', firstName: 'Sara', lastName: 'Colombo', avatarUrl: null }
const CHAT_ID = 'f1'

function message(overrides: Partial<ChatMessageResponse> = {}): ChatMessageResponse {
  return { id: 'm1', friendshipId: CHAT_ID, senderId: SARA.id, content: 'Ci vediamo al concerto?', sentAt: '2027-06-01T10:00:00Z', readAt: '2027-06-01T10:05:00Z', ...overrides }
}

function page<T>(items: T[], totalPages = 1) {
  return { content: items, page: { size: 30, number: 0, totalElements: items.length, totalPages } }
}

function chat(overrides: Partial<ChatSummaryResponse> = {}): ChatSummaryResponse {
  return { chatId: CHAT_ID, user: SARA, canWrite: true, lastMessage: message(), unreadMessages: 0, ...overrides }
}

interface ConversationOptions {
  /** Dal piu' recente, come li restituisce il backend. */
  messages?: ChatMessageResponse[]
  friends?: FriendResponse[]
  inbox?: ChatSummaryResponse[]
}

function setupConversation(options: ConversationOptions = {}) {
  const friends = options.friends ?? [{ friendshipId: CHAT_ID, friend: SARA, since: '2027-01-01T10:00:00Z', unreadMessages: 0 }]
  const readCalls: string[] = []
  server.use(
    http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
    http.get(`${API}/api/friendships`, () => HttpResponse.json(page(friends))),
    http.get(`${API}/api/chats`, () => HttpResponse.json(page(options.inbox ?? []))),
    http.get(`${API}/api/chats/:id/messages`, () => HttpResponse.json(page(options.messages ?? []))),
    http.patch(`${API}/api/chats/:id/read`, ({ params }) => {
      readCalls.push(String(params.id))
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return { readCalls }
}

async function connect() {
  await waitFor(() => expect(fakeRealtime.active).toBe(1))
  act(() => fakeRealtime.connect())
}

describe('ChatsPage', () => {
  it('elenca le conversazioni con ultimo messaggio e non letti', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
      http.get(`${API}/api/chats`, () =>
        HttpResponse.json(
          page([
            chat({ unreadMessages: 2 }),
            chat({ chatId: 'f2', user: { id: 'u3', firstName: 'Davide', lastName: 'Russo', avatarUrl: null }, canWrite: false, lastMessage: message({ id: 'm2', friendshipId: 'f2', senderId: ME.id, content: 'A presto' }) }),
          ]),
        ),
      ),
    )
    renderRoute('/chats')

    const sara = (await screen.findByRole('link', { name: 'Sara Colombo' })).closest('li')
    expect(screen.getByRole('link', { name: 'Sara Colombo' })).toHaveAttribute('href', '/chats/f1')
    expect(within(sara as HTMLElement).getByText('Ci vediamo al concerto?')).toBeInTheDocument()
    expect(within(sara as HTMLElement).getByText('2 messaggi non letti')).toBeInTheDocument()

    const davide = screen.getByRole('link', { name: 'Davide Russo' }).closest('li')
    expect(within(davide as HTMLElement).getByText('Tu: A presto')).toBeInTheDocument()
    expect(within(davide as HTMLElement).getByText(/Solo lettura/)).toBeInTheDocument()
  })

  it('senza conversazioni invita ad andare dagli amici', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
      http.get(`${API}/api/chats`, () => HttpResponse.json(EMPTY_PAGE)),
    )
    renderRoute('/chats')

    expect(await screen.findByRole('heading', { name: 'Nessuna conversazione' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai agli amici' })).toHaveAttribute('href', '/friends')
  })
})

describe('ConversationPage', () => {
  it('mostra lo storico dal piu\' vecchio, il nome dell\'amico e segna i messaggi come letti', async () => {
    const backend = setupConversation({
      messages: [
        message({ id: 'm3', content: 'Perfetto, a dopo', sentAt: '2027-06-01T10:10:00Z', readAt: null }),
        message({ id: 'm2', senderId: ME.id, content: 'Sì, alle 21', sentAt: '2027-06-01T10:05:00Z' }),
        message({ id: 'm1' }),
      ],
    })
    renderRoute(`/chats/${CHAT_ID}`)

    expect(await screen.findByRole('link', { name: 'Sara Colombo' })).toHaveAttribute('href', '/users/u2')
    const log = await screen.findByRole('log', { name: 'Messaggi' })
    // Nell'ordine in cui compaiono nella pagina.
    const texts = within(log).getAllByText(/concerto|alle 21|a dopo/).map((item) => item.textContent)
    expect(texts).toEqual(['Ci vediamo al concerto?', 'Sì, alle 21', 'Perfetto, a dopo'])
    await waitFor(() => expect(backend.readCalls).toEqual([CHAT_ID]))
  })

  it('finche\' la chat non e\' collegata non si puo\' inviare', async () => {
    setupConversation()
    renderRoute(`/chats/${CHAT_ID}`)

    await userEvent.setup().type(await screen.findByRole('textbox', { name: 'Messaggio' }), 'Ciao')

    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
    expect(screen.getByText('Connessione alla chat in corso…')).toBeInTheDocument()
  })

  it('invia con Invio, mostra "Invio…" e conferma quando torna la copia dal server', async () => {
    setupConversation()
    renderRoute(`/chats/${CHAT_ID}`)
    const input = await screen.findByRole('textbox', { name: 'Messaggio' })
    await connect()

    await userEvent.setup().type(input, '  Ciao Sara!  {Enter}')

    expect(fakeRealtime.sent).toEqual([{ friendshipId: CHAT_ID, content: 'Ciao Sara!' }])
    expect(input).toHaveValue('')
    expect(screen.getByText('Invio…')).toBeInTheDocument()

    act(() => fakeRealtime.chatMessage(message({ id: 'm9', senderId: ME.id, content: 'Ciao Sara!', sentAt: '2027-06-01T12:00:00Z', readAt: null })))

    await waitFor(() => expect(screen.queryByText('Invio…')).not.toBeInTheDocument())
    expect(screen.getAllByText('Ciao Sara!')).toHaveLength(1)
  })

  it('un errore del server lascia il messaggio come "Non inviato", da riprovare o scartare', async () => {
    setupConversation()
    renderRoute(`/chats/${CHAT_ID}`)
    const input = await screen.findByRole('textbox', { name: 'Messaggio' })
    await connect()
    const user = userEvent.setup()
    await user.type(input, 'Ciao{Enter}')

    act(() => fakeRealtime.error('Chat disponibile solo tra amici con account attivo'))

    expect(await screen.findByText('Non inviato')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: "Riprova l'invio" }))
    expect(fakeRealtime.sent).toHaveLength(2)
    expect(screen.getByText('Invio…')).toBeInTheDocument()

    act(() => fakeRealtime.error('Chat disponibile solo tra amici con account attivo'))
    await user.click(await screen.findByRole('button', { name: 'Scarta il messaggio' }))
    expect(screen.queryByText('Ciao')).not.toBeInTheDocument()
  })

  it('se la connessione cade prima della conferma il messaggio resta "Non inviato"', async () => {
    setupConversation()
    renderRoute(`/chats/${CHAT_ID}`)
    const input = await screen.findByRole('textbox', { name: 'Messaggio' })
    await connect()
    await userEvent.setup().type(input, 'Ci sei?{Enter}')
    expect(screen.getByText('Invio…')).toBeInTheDocument()

    act(() => fakeRealtime.disconnect())

    expect(await screen.findByText('Non inviato')).toBeInTheDocument()
    expect(screen.getByText('Connessione alla chat in corso…')).toBeInTheDocument()
  })

  it('passando a un\'altra chat i messaggi in attesa non la seguono', async () => {
    setupConversation()
    const { router } = renderRoute(`/chats/${CHAT_ID}`)
    const input = await screen.findByRole('textbox', { name: 'Messaggio' })
    await connect()
    await userEvent.setup().type(input, 'Solo per Sara{Enter}')
    expect(screen.getByText('Solo per Sara')).toBeInTheDocument()

    await act(() => router.navigate('/chats/f2'))

    await waitFor(() => expect(screen.queryByText('Solo per Sara')).not.toBeInTheDocument())
    expect(await screen.findByRole('textbox', { name: 'Messaggio' })).toHaveValue('')
  })

  it('un messaggio ricevuto compare subito e viene segnato come letto', async () => {
    const backend = setupConversation()
    renderRoute(`/chats/${CHAT_ID}`)
    await screen.findByRole('textbox', { name: 'Messaggio' })
    await connect()

    act(() => fakeRealtime.chatMessage(message({ id: 'm5', content: 'Sei arrivato?', readAt: null })))

    expect(await screen.findByText('Sei arrivato?')).toBeInTheDocument()
    await waitFor(() => expect(backend.readCalls).toEqual([CHAT_ID]))
  })

  it('amicizia tolta: lo storico si legge ma non si scrive', async () => {
    setupConversation({ friends: [], inbox: [chat({ canWrite: false })], messages: [message()] })
    renderRoute(`/chats/${CHAT_ID}`)

    expect(await screen.findByText('Ci vediamo al concerto?')).toBeInTheDocument()
    expect(await screen.findByText(/Non potete più scrivervi/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Messaggio' })).not.toBeInTheDocument()
  })

  it('chat inesistente o di altri: pagina dedicata', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => HttpResponse.json(ME)),
      http.get(`${API}/api/friendships`, () => HttpResponse.json(EMPTY_PAGE)),
      http.get(`${API}/api/chats`, () => HttpResponse.json(EMPTY_PAGE)),
      http.get(`${API}/api/chats/:id/messages`, () => HttpResponse.json({ status: 404, detail: 'Chat non trovata' }, { status: 404 })),
    )
    renderRoute('/chats/altra')

    expect(await screen.findByRole('heading', { name: 'Conversazione non trovata' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Torna alle chat' })).toHaveAttribute('href', '/chats')
  })
})
