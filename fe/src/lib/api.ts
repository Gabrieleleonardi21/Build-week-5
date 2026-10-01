import { getCsrfToken, refreshCsrf } from './csrf'
import { API_BASE } from './env'
import { ApiError, parseProblem } from './errors'

// Client HTTP unico dell'app (docs/API.md §1-2): cookie di sessione, CSRF, errori ProblemDetail.
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiOptions {
  method?: HttpMethod
  /** Oggetto (inviato come JSON) oppure FormData (upload, il browser mette il boundary). */
  body?: unknown
  signal?: AbortSignal
  /** false = un 401 non significa "sessione scaduta" (es. GET /api/auth/me all'avvio). */
  session?: boolean
}

let onUnauthorized: () => void = () => {}

/** L'AuthProvider registra qui cosa fare quando la sessione scade (azzerare l'utente). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

async function send(path: string, method: HttpMethod, options: ApiOptions): Promise<Response> {
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }
  if (method !== 'GET') {
    headers['X-XSRF-TOKEN'] = await getCsrfToken()
  }
  try {
    return await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body,
      signal: options.signal,
      credentials: 'include',
    })
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, 'Impossibile contattare il server. Controlla la connessione e riprova.')
  }
}

function toError(response: Response, text: string): ApiError {
  return parseProblem(response.status, text, response.headers.get('Retry-After'))
}

/**
 * Chiamata al backend. 204 o body vuoto -> undefined.
 * Un 403 senza "detail" su una scrittura e' il filtro CSRF (token scaduto dopo login/logout
 * in un'altra scheda): si rilegge il token e si riprova una sola volta.
 */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  let response = await send(path, method, options)
  let text = await response.text()

  if (response.status === 403 && method !== 'GET' && !toError(response, text).hasDetail) {
    await refreshCsrf()
    response = await send(path, method, options)
    text = await response.text()
  }

  if (!response.ok) {
    const error = toError(response, text)
    if (response.status === 401 && options.session !== false) {
      onUnauthorized()
    }
    throw error
  }
  if (text === '') {
    return undefined as T
  }
  return JSON.parse(text) as T
}
