import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T2. Endpoint: /api/artists (creazione: loggati; modifica e cancellazione: MODERATOR).
export const artistRoutes: FeatureRoutes = {
  public: [
    { path: '/artists', lazy: () => import('./pages/ArtistsPage').then((module) => ({ Component: module.ArtistsPage })) },
    { path: '/artists/:id', lazy: () => import('./pages/ArtistDetailPage').then((module) => ({ Component: module.ArtistDetailPage })) },
  ],
}
