import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T4. Endpoint: /api/friendships, /api/users.
export const friendRoutes: FeatureRoutes = {
  auth: [
    placeholderRoute('/friends', 'Amici', 'Amici, richieste ricevute e inviate, ricerca utenti.'),
    placeholderRoute('/users/:id', 'Profilo utente', 'Profilo pubblico di un utente.'),
  ],
}
