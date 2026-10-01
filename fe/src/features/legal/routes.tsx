import type { FeatureRoutes } from '@/app/feature-routes'

// Pagina statica: lazy, la apre solo chi segue il link dalla registrazione o dal footer.
export const legalRoutes: FeatureRoutes = {
  public: [{ path: '/privacy', lazy: () => import('./pages/PrivacyPage').then((module) => ({ Component: module.PrivacyPage })) }],
}
