import type { FeatureRoutes } from '@/app/feature-routes'

// Traccia T1. Flusso: registrazione -> codice via email -> verifica -> login (docs/API.md §3).
export const authRoutes: FeatureRoutes = {
  guest: [
    { path: '/login', lazy: () => import('./pages/LoginPage').then((m) => ({ Component: m.LoginPage })) },
    { path: '/register', lazy: () => import('./pages/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },
    { path: '/verify', lazy: () => import('./pages/VerifyPage').then((m) => ({ Component: m.VerifyPage })) },
  ],
}
