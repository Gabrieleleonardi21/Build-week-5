import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

export const legalRoutes: FeatureRoutes = {
  public: [placeholderRoute('/privacy', 'Privacy', 'Informativa privacy, collegata dalla registrazione.')],
}
