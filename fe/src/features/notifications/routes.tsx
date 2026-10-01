import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T4. Endpoint: /api/notifications (+ tempo reale su /user/queue/notifications).
export const notificationRoutes: FeatureRoutes = {
  auth: [
    {
      path: '/notifications',
      lazy: () => import('./pages/NotificationsPage').then((module) => ({ Component: module.NotificationsPage })),
    },
  ],
}
