import { Client, type IMessage } from '@stomp/stompjs'
import { getCsrfToken, refreshCsrf } from './csrf'
import { wsUrl } from './env'
import type { ChatMessageResponse, NotificationResponse } from './types'

// Tempo reale (docs/API.md §8): STOMP su WebSocket nativo. Il cookie di sessione autentica
// l'handshake, il token CSRF va nell'header del frame CONNECT (WebSocketSecurityConfig).
const RECONNECT_DELAY_MS = 5000
const QUEUE_NOTIFICATIONS = '/user/queue/notifications'
const QUEUE_CHAT = '/user/queue/chat'
const QUEUE_ERRORS = '/user/queue/errors'
const SEND_CHAT = '/app/chat.send'

export interface RealtimeHandlers {
  onNotification: (notification: NotificationResponse) => void
  /** Messaggi ricevuti e copia dei propri messaggi inviati (conferma dell'invio). */
  onChatMessage: (message: ChatMessageResponse) => void
  /** Errore sul proprio invio: testo semplice gia' in italiano. */
  onError: (text: string) => void
  onConnectionChange: (connected: boolean) => void
}

export interface RealtimeClient {
  start: () => void
  stop: () => void
  /** false se il socket non e' collegato: il messaggio non e' partito. */
  sendChatMessage: (friendshipId: string, content: string) => boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Il body arriva dalla rete: si controllano i campi usati prima di fidarsi del tipo. */
function parseBody(message: IMessage, requiredFields: readonly string[]): Record<string, unknown> | null {
  let body: unknown
  try {
    body = JSON.parse(message.body)
  } catch {
    return null
  }
  if (!isRecord(body)) {
    return null
  }
  for (const field of requiredFields) {
    if (typeof body[field] !== 'string') {
      return null
    }
  }
  return body
}

/** Client STOMP dell'utente loggato: si ricollega da solo e si riscrive alle tre code. */
export function createRealtimeClient(handlers: RealtimeHandlers): RealtimeClient {
  const client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: RECONNECT_DELAY_MS,
    // A ogni (ri)connessione si rilegge il token: dopo login o cambio password quello vecchio non vale.
    beforeConnect: async () => {
      client.connectHeaders = { 'X-XSRF-TOKEN': await getCsrfToken() }
    },
    onConnect: () => {
      client.subscribe(QUEUE_NOTIFICATIONS, (message) => {
        const body = parseBody(message, ['id', 'type', 'title', 'body', 'createdAt'])
        if (body !== null) {
          handlers.onNotification(body as NotificationResponse)
        }
      })
      client.subscribe(QUEUE_CHAT, (message) => {
        const body = parseBody(message, ['id', 'friendshipId', 'senderId', 'content', 'sentAt'])
        if (body !== null) {
          handlers.onChatMessage(body as ChatMessageResponse)
        }
      })
      // Testo semplice, non JSON.
      client.subscribe(QUEUE_ERRORS, (message) => handlers.onError(message.body))
      handlers.onConnectionChange(true)
    },
    onWebSocketClose: () => handlers.onConnectionChange(false),
    // CONNECT rifiutato (di solito token CSRF scaduto): il prossimo tentativo ne usa uno nuovo.
    onStompError: () => {
      void refreshCsrf().catch(() => undefined)
    },
  })

  return {
    start: () => client.activate(),
    stop: () => {
      void client.deactivate()
    },
    sendChatMessage: (friendshipId, content) => {
      if (!client.connected) {
        return false
      }
      client.publish({ destination: SEND_CHAT, body: JSON.stringify({ friendshipId, content }) })
      return true
    },
  }
}
