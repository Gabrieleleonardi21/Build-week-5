import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T2. Endpoint: /api/artists (modifica e cancellazione: MODERATOR).
export const artistRoutes: FeatureRoutes = {
  public: [
    placeholderRoute('/artists', 'Artisti', 'Ricerca artisti per nome (GET /api/artists).'),
    placeholderRoute('/artists/:id', 'Artista', 'Dettaglio artista (GET /api/artists/{id}).'),
  ],
}
