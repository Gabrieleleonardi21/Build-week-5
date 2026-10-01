import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T1. Endpoint: /api/me (dati, password, avatar, eliminazione account).
export const profileRoutes: FeatureRoutes = {
  auth: [{ path: '/profile', lazy: () => import('./pages/ProfilePage').then((module) => ({ Component: module.ProfilePage })) }],
}
