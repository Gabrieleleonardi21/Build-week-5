import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T4. Endpoint: /api/events/{id}/tickets, /api/me/tickets, /api/events/{id}/participants.
export const ticketRoutes: FeatureRoutes = {
  auth: [placeholderRoute('/me/tickets', 'I miei ticket', 'Ticket validi degli eventi a cui sei iscritto.')],
}
