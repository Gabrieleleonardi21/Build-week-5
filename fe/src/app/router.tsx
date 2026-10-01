import { createBrowserRouter, type RouteObject } from 'react-router'
import { RequireAuth, RequireGuest, RequireRole } from '@/components/auth/guards'
import { ErrorPage, NotFoundPage } from '@/components/feedback/ErrorPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { adminRoutes } from '@/features/admin/routes'
import { artistRoutes } from '@/features/artists/routes'
import { authRoutes } from '@/features/auth/routes'
import { chatRoutes } from '@/features/chat/routes'
import { eventRoutes } from '@/features/events/routes'
import { friendRoutes } from '@/features/friends/routes'
import { legalRoutes } from '@/features/legal/routes'
import { notificationRoutes } from '@/features/notifications/routes'
import { profileRoutes } from '@/features/profile/routes'
import { ticketRoutes } from '@/features/tickets/routes'
import type { FeatureRoutes } from './feature-routes'

// Per aggiungere una feature: creare features/<nome>/routes.tsx e aggiungerla qui.
const FEATURES: readonly FeatureRoutes[] = [
  eventRoutes,
  artistRoutes,
  authRoutes,
  ticketRoutes,
  notificationRoutes,
  friendRoutes,
  chatRoutes,
  profileRoutes,
  adminRoutes,
  legalRoutes,
]

function collect(group: keyof FeatureRoutes): RouteObject[] {
  return FEATURES.flatMap((feature) => feature[group] ?? [])
}

/** Albero delle rotte, esportato per i test (createMemoryRouter). */
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    // Aprendo direttamente una pagina lazy (es. il link di un'email), finche' il codice non arriva.
    hydrateFallbackElement: <div className="min-h-dvh" aria-busy="true" aria-label="Caricamento…" />,
    children: [
      ...collect('public'),
      { element: <RequireGuest />, children: collect('guest') },
      { element: <RequireAuth />, children: collect('auth') },
      { element: <RequireRole min="MODERATOR" />, children: collect('admin') },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
