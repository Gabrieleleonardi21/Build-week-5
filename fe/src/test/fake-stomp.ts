import type { RealtimeClient, RealtimeHandlers } from '@/lib/stomp'
import type { ChatMessageResponse, NotificationResponse } from '@/lib/types'

// Sostituto di lib/stomp per i test (collegato in setup.ts): nessun WebSocket vero.
// Il test decide quando il socket "si collega" e cosa arriva dal server.
interface SentMessage {
  friendshipId: string
  content: string
}

class FakeRealtime {
  private handlers: RealtimeHandlers | null = null
  private connected = false
  readonly sent: SentMessage[] = []
  /** Quanti client sono attivi: dopo il logout deve tornare a zero. */
  active = 0

  create(handlers: RealtimeHandlers): RealtimeClient {
    return {
      start: () => {
        this.handlers = handlers
        this.active += 1
      },
      stop: () => {
        this.active -= 1
        if (this.handlers === handlers) {
          this.handlers = null
          this.connected = false
        }
      },
      sendChatMessage: (friendshipId, content) => {
        if (!this.connected) {
          return false
        }
        this.sent.push({ friendshipId, content })
        return true
      },
    }
  }

  private require(): RealtimeHandlers {
    if (this.handlers === null) {
      throw new Error("Nessun client in tempo reale attivo: l'utente e' loggato?")
    }
    return this.handlers
  }

  // ---- comandi usati dai test
  connect(): void {
    this.connected = true
    this.require().onConnectionChange(true)
  }

  disconnect(): void {
    this.connected = false
    this.require().onConnectionChange(false)
  }

  notification(notification: NotificationResponse): void {
    this.require().onNotification(notification)
  }

  chatMessage(message: ChatMessageResponse): void {
    this.require().onChatMessage(message)
  }

  error(text: string): void {
    this.require().onError(text)
  }

  reset(): void {
    this.handlers = null
    this.connected = false
    this.sent.length = 0
    this.active = 0
  }
}

export const fakeRealtime = new FakeRealtime()

export function createRealtimeClient(handlers: RealtimeHandlers): RealtimeClient {
  return fakeRealtime.create(handlers)
}
