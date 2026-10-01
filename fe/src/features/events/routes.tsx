import type { FeatureRoutes } from '@/app/feature-routes'
import { DiscoverPage } from './pages/DiscoverPage'

// Traccia T2 (scoperta) e T3 (organizzatore). Endpoint: /api/events, /api/events/map, /api/me/events.
export const eventRoutes: FeatureRoutes = {
  public: [
    // Home: importata subito (non lazy), e' la prima pagina che si apre.
    { path: '/', element: <DiscoverPage /> },
    {
      path: '/map',
      lazy: () => import('./pages/EventsMapPage').then((module) => ({ Component: module.EventsMapPage })),
    },
    // Lazy: la mappa (Leaflet) si scarica solo quando si apre un evento.
    {
      path: '/events/:id',
      lazy: () => import('./pages/EventDetailPage').then((module) => ({ Component: module.EventDetailPage })),
    },
  ],
  auth: [
    // Traccia T3. Il form (mappa, scaletta, upload) e' lazy: lo scarica solo chi organizza.
    { path: '/events/new', lazy: () => import('./pages/EventFormPage').then((module) => ({ Component: module.EventCreatePage })) },
    { path: '/events/:id/edit', lazy: () => import('./pages/EventFormPage').then((module) => ({ Component: module.EventEditPage })) },
    { path: '/me/events', lazy: () => import('./pages/MyEventsPage').then((module) => ({ Component: module.MyEventsPage })) },
  ],
}
