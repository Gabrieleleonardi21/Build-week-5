import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { chatKeys } from '@/features/chat/api'
import { eventKeys } from '@/features/events/api'
import { friendKeys } from '@/features/friends/api'
import { notificationKeys } from '@/features/notifications/api'
import { ticketKeys } from '@/features/tickets/api'
import type { ChatMessageResponse, NotificationResponse, Page, UnreadCountResponse } from '@/lib/types'

// Cosa cambia nella cache quando arriva qualcosa in tempo reale. Funzioni senza React:
// si provano da sole e il provider resta piccolo.

/** Nuova notifica: contatore +1, liste da ricaricare e, secondo il tipo, i dati a cui si riferisce. */
export function applyNotification(queryClient: QueryClient, notification: NotificationResponse): void {
  queryClient.setQueryData<UnreadCountResponse>(notificationKeys.unread(), (current) => {
    if (current === undefined) {
      return current
    }
    return { unread: current.unread + 1 }
  })
  void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })

  if (notification.type === 'FRIEND_REQUEST' || notification.type === 'FRIEND_ACCEPTED') {
    void queryClient.invalidateQueries({ queryKey: friendKeys.all })
    return
  }
  if (notification.type === 'OWNER_MESSAGE') {
    return
  }
  // Evento modificato o annullato, nuovo partecipante: dettaglio, liste e ticket mostrano dati vecchi.
  if (notification.eventId !== null) {
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(notification.eventId) })
  }
  void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: ticketKeys.all })
}

/**
 * Il socket e' tornato dopo una caduta: quello che e' arrivato nel frattempo (messaggi, notifiche,
 * richieste di amicizia) non verra' rimandato, quindi si rilegge dal backend.
 */
export function refreshAfterReconnect(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: chatKeys.all })
  void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  void queryClient.invalidateQueries({ queryKey: friendKeys.all })
}

/**
 * Messaggio di chat (ricevuto, o copia del proprio): entra in cima alla prima pagina dello storico
 * gia' caricato, senza rifare la chiamata. Inbox e amici (contatori dei non letti) si ricaricano.
 */
export function applyChatMessage(queryClient: QueryClient, message: ChatMessageResponse): void {
  queryClient.setQueryData<InfiniteData<Page<ChatMessageResponse>>>(chatKeys.messages(message.friendshipId), (current) => {
    const first = current?.pages[0]
    if (current === undefined || first === undefined) {
      return current
    }
    // Dopo una riconnessione lo stesso messaggio puo' arrivare due volte.
    const known = current.pages.some((page) => page.content.some((item) => item.id === message.id))
    if (known) {
      return current
    }
    const updatedFirst = { ...first, content: [message, ...first.content] }
    return { ...current, pages: [updatedFirst, ...current.pages.slice(1)] }
  })
  void queryClient.invalidateQueries({ queryKey: chatKeys.inboxes() })
  void queryClient.invalidateQueries({ queryKey: friendKeys.all })
}
