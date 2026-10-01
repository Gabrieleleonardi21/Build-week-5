import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T4. Storico REST (/api/chats) + invio e ricezione via STOMP (/app/chat.send, /user/queue/chat).
export const chatRoutes: FeatureRoutes = {
  auth: [
    { path: '/chats', lazy: () => import('./pages/ChatsPage').then((module) => ({ Component: module.ChatsPage })) },
    {
      path: '/chats/:chatId',
      lazy: () => import('./pages/ConversationPage').then((module) => ({ Component: module.ConversationPage })),
    },
  ],
}
