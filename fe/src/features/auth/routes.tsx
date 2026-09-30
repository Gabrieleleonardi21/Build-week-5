import type { FeatureRoutes } from '@/app/feature-routes'
import { placeholderRoute } from '@/app/placeholder-route'

// Traccia T1. Flusso: registrazione -> codice via email -> verifica -> login (docs/API.md §3).
export const authRoutes: FeatureRoutes = {
  guest: [
    placeholderRoute('/login', 'Accedi', 'Login con gestione di 401, 403 EMAIL_NOT_VERIFIED/ACCOUNT_DEACTIVATED e 429.'),
    placeholderRoute('/register', 'Registrati', 'Registrazione con data di nascita e privacy.'),
    placeholderRoute('/verify', 'Verifica email', 'Codice di 6 cifre e reinvio (massimo 3 ogni 15 minuti).'),
  ],
}
