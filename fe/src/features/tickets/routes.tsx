import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T4. Endpoint: /api/events/{id}/tickets, /api/me/tickets, /api/events/{id}/participants.
// JoinButton e ParticipantsList non hanno rotte: li monta il dettaglio evento.
export const ticketRoutes: FeatureRoutes = {
  auth: [{ path: '/me/tickets', lazy: () => import('./pages/MyTicketsPage').then((module) => ({ Component: module.MyTicketsPage })) }],
}
