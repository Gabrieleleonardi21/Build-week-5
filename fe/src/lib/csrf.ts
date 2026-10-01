import { API_BASE } from './env'

// Token CSRF solo in memoria: in produzione FE e BE sono su domini diversi e il cookie
// XSRF-TOKEN del backend non e' leggibile da JavaScript. Il valore arriva dal body di
// GET /api/auth/csrf e va rimandato nell'header X-XSRF-TOKEN (docs/API.md §2).
let pending: Promise<string> | null = null

async function fetchToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(`Token CSRF non disponibile (${response.status})`)
  }
  const body: unknown = await response.json()
  if (typeof body === 'object' && body !== null && 'token' in body && typeof body.token === 'string') {
    return body.token
  }
  throw new Error('Risposta CSRF non valida')
}

/** Token corrente; la prima chiamata lo scarica, le successive riusano la stessa promise. */
export function getCsrfToken(): Promise<string> {
  if (pending === null) {
    // Se il download fallisce si azzera, cosi' la chiamata successiva riprova.
    pending = fetchToken().catch((error: unknown) => {
      pending = null
      throw error
    })
  }
  return pending
}

/** Da chiamare all'avvio e dopo login, logout e cambio password: il token cambia. */
export function refreshCsrf(): Promise<string> {
  pending = null
  return getCsrfToken()
}
