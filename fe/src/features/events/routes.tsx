import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'
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
    placeholderRoute('/events/new', 'Nuovo evento', 'Form evento con scaletta e marker; le foto salgono in background.'),
    placeholderRoute('/events/:id/edit', 'Modifica evento', 'Dati, foto, locandine e descrizione con AI.'),
    placeholderRoute('/me/events', 'I miei eventi', 'Eventi creati, anche passati e annullati (GET /api/me/events).'),
  ],
}
