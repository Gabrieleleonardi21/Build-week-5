import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T4. Endpoint: /api/notifications (+ tempo reale su /user/queue/notifications).
export const notificationRoutes: FeatureRoutes = {
  auth: [placeholderRoute('/notifications', 'Notifiche', 'Notifiche con segna come letta e contatore.')],
}
