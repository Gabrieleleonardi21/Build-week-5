import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T1. Endpoint: /api/admin/users (cambio ruolo solo SUPERADMIN).
export const adminRoutes: FeatureRoutes = {
  admin: [{ path: '/admin/users', lazy: () => import('./pages/AdminUsersPage').then((module) => ({ Component: module.AdminUsersPage })) }],
}
