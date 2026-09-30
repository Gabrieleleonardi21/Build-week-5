import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T1. Endpoint: /api/admin/users (cambio ruolo solo SUPERADMIN).
export const adminRoutes: FeatureRoutes = {
  admin: [placeholderRoute('/admin/users', 'Account', 'Ricerca account, attivazione/disattivazione, cambio ruolo.')],
}
