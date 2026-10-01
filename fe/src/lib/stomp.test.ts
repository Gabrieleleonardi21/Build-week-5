import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CSRF_TOKEN } from '@/test/msw/server'
import type * as StompModule from './stomp'
import type { RealtimeHandlers } from './stomp'

// Client STOMP finto: il test chiama a mano le callback che la libreria chiamerebbe col socket vero.
const { FakeClient, instances } = vi.hoisted(() => {
  interface Frame {
    body: string
  }
  interface Config {
    brokerURL: string
    reconnectDelay: number
    beforeConnect: () => Promise<void>
    onConnect: () => void
    onWebSocketClose: () => void
    onStompError: () => void
  }
  const instances: FakeClient[] = []
  class FakeClient {
    connected = false
    connectHeaders: Record<string, string> = {}
    readonly subscriptions = new Map<string, (frame: Frame) => void>()
    readonly published: Array<{ destination: string; body: string }> = []
    activated = 0
    deactivated = 0
    readonly config: Config

    constructor(config: Config) {
      this.config = config
      instances.push(this)
    }

    activate(): void {
      this.activated += 1
    }

    deactivate(): Promise<void> {
      this.deactivated += 1
      return Promise.resolve()
    }

    subscribe(destination: string, callback: (frame: Frame) => void): void {
      this.subscriptions.set(destination, callback)
    }

    publish(frame: { destination: string; body: string }): void {
      this.published.push(frame)
    }

    receive(destination: string, body: string): void {
      this.subscriptions.get(destination)?.({ body })
    }
  }
  return { FakeClient, instances }
})

vi.mock('@stomp/stompjs', () => ({ Client: FakeClient }))

// setup.ts sostituisce lib/stomp per tutti gli altri test: qui si prova quello vero.
const { createRealtimeClient } = await vi.importActual<typeof StompModule>('./stomp')

function setup() {
  const handlers: RealtimeHandlers = {
    onNotification: vi.fn(),
    onChatMessage: vi.fn(),
    onError: vi.fn(),
    onConnectionChange: vi.fn(),
  }
  const client = createRealtimeClient(handlers)
  const stomp = instances.at(-1)
  if (stomp === undefined) {
    throw new Error('Client STOMP non creato')
  }
  return { handlers, client, stomp }
}

const NOTIFICATION = { id: 'n1', type: 'OWNER_MESSAGE', title: 'Cambio orario', body: 'Si apre alle 20', eventId: 'e1', readAt: null, createdAt: '2027-06-01T10:00:00Z' }
const MESSAGE = { id: 'm1', friendshipId: 'f1', senderId: 'u2', content: 'Ciao!', sentAt: '2027-06-01T10:00:00Z', readAt: null }

describe('createRealtimeClient', () => {
  beforeEach(() => {
    instances.length = 0
  })

  it('si collega al WebSocket del backend e manda il token CSRF nel CONNECT', async () => {
    const { client, stomp } = setup()

    client.start()
    await stomp.config.beforeConnect()

    expect(stomp.config.brokerURL).toBe('ws://api.test/ws')
    expect(stomp.activated).toBe(1)
    expect(stomp.connectHeaders).toEqual({ 'X-XSRF-TOKEN': CSRF_TOKEN })
  })

  it('alla connessione si iscrive alle tre code e consegna notifiche, messaggi ed errori', () => {
    const { handlers, stomp } = setup()

    stomp.config.onConnect()
    stomp.receive('/user/queue/notifications', JSON.stringify(NOTIFICATION))
    stomp.receive('/user/queue/chat', JSON.stringify(MESSAGE))
    stomp.receive('/user/queue/errors', 'Chat disponibile solo tra amici con account attivo')

    expect(handlers.onConnectionChange).toHaveBeenCalledWith(true)
    expect(handlers.onNotification).toHaveBeenCalledWith(NOTIFICATION)
    expect(handlers.onChatMessage).toHaveBeenCalledWith(MESSAGE)
    expect(handlers.onError).toHaveBeenCalledWith('Chat disponibile solo tra amici con account attivo')
  })

  it('scarta i frame che non sono JSON o a cui mancano i campi usati', () => {
    const { handlers, stomp } = setup()

    stomp.config.onConnect()
    stomp.receive('/user/queue/notifications', '<html>')
    stomp.receive('/user/queue/notifications', JSON.stringify([NOTIFICATION]))
    stomp.receive('/user/queue/chat', JSON.stringify({ id: 'm1', content: 42 }))

    expect(handlers.onNotification).not.toHaveBeenCalled()
    expect(handlers.onChatMessage).not.toHaveBeenCalled()
  })

  it('segnala quando il socket si chiude', () => {
    const { handlers, stomp } = setup()

    stomp.config.onWebSocketClose()

    expect(handlers.onConnectionChange).toHaveBeenCalledWith(false)
  })

  it('invia un messaggio solo se il socket e\' collegato', () => {
    const { client, stomp } = setup()

    expect(client.sendChatMessage('f1', 'Ciao')).toBe(false)
    expect(stomp.published).toHaveLength(0)

    stomp.connected = true
    expect(client.sendChatMessage('f1', 'Ciao')).toBe(true)
    expect(stomp.published).toEqual([{ destination: '/app/chat.send', body: JSON.stringify({ friendshipId: 'f1', content: 'Ciao' }) }])
  })

  it('stop chiude la connessione', () => {
    const { client, stomp } = setup()

    client.stop()

    expect(stomp.deactivated).toBe(1)
  })
})
