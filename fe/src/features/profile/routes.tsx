import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T1. Endpoint: /api/me (dati, password, avatar, eliminazione account).
export const profileRoutes: FeatureRoutes = {
  auth: [placeholderRoute('/profile', 'Profilo', 'Dati personali, avatar, password ed eliminazione account.')],
}
