import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T4. Endpoint: /api/friendships, /api/users.
export const friendRoutes: FeatureRoutes = {
  auth: [
    { path: '/friends', lazy: () => import('./pages/FriendsPage').then((module) => ({ Component: module.FriendsPage })) },
    { path: '/users/:id', lazy: () => import('./pages/UserProfilePage').then((module) => ({ Component: module.UserProfilePage })) },
  ],
}
