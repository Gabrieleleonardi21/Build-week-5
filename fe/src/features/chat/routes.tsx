import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T4. Storico REST (/api/chats) + invio e ricezione via STOMP (/app/chat.send, /user/queue/chat).
export const chatRoutes: FeatureRoutes = {
  auth: [
    placeholderRoute('/chats', 'Chat', 'Elenco delle conversazioni con i messaggi non letti.'),
    placeholderRoute('/chats/:chatId', 'Conversazione', 'Messaggi in tempo reale con un amico.'),
  ],
}
