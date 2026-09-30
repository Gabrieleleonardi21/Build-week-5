// Indirizzo del backend. Vuoto in sviluppo: /api e /ws passano dal proxy di Vite.
// In produzione (Render) e' l'URL completo del servizio backend.
function readApiBase(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw !== 'string') {
    return ''
  }
  return raw.replace(/\/$/, '')
}

export const API_BASE: string = readApiBase()

/** URL del WebSocket STOMP: stesso host della pagina in sviluppo, host del backend in produzione. */
export function wsUrl(): string {
  if (API_BASE === '') {
    let protocol = 'ws:'
    if (window.location.protocol === 'https:') {
      protocol = 'wss:'
    }
    return `${protocol}//${window.location.host}/ws`
  }
  return `${API_BASE.replace(/^http/, 'ws')}/ws`
}
