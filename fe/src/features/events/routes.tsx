import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'
import { DiscoverPage } from './pages/DiscoverPage'

// Traccia T2 (scoperta) e T3 (organizzatore). Endpoint: /api/events, /api/events/map, /api/me/events.
export const eventRoutes: FeatureRoutes = {
  public: [
    // Home: importata subito (non lazy), e' la prima pagina che si apre.
    { path: '/', element: <DiscoverPage /> },
    placeholderRoute('/map', 'Mappa eventi', 'Eventi sulla mappa (GET /api/events/map, react-leaflet).'),
    placeholderRoute('/events/:id', 'Dettaglio evento', 'Foto, scaletta, mappa con ingressi e uscite, iscrizione.'),
  ],
  auth: [
    placeholderRoute('/events/new', 'Nuovo evento', 'Form evento con scaletta e marker; le foto salgono in background.'),
    placeholderRoute('/events/:id/edit', 'Modifica evento', 'Dati, foto, locandine e descrizione con AI.'),
    placeholderRoute('/me/events', 'I miei eventi', 'Eventi creati, anche passati e annullati (GET /api/me/events).'),
  ],
}
