import { toast } from 'sonner'

// Errori del backend in formato ProblemDetail (RFC 9457), docs/API.md §5.
const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  0: 'Impossibile contattare il server. Controlla la connessione e riprova.',
  400: 'Dati non validi.',
  401: 'Devi accedere per continuare.',
  403: 'Non hai i permessi per questa operazione.',
  404: 'Risorsa non trovata.',
  409: 'Operazione in conflitto con lo stato attuale. Aggiorna la pagina e riprova.',
  413: 'Il file supera i 5 MB.',
  429: 'Troppe richieste. Riprova tra qualche minuto.',
  503: 'Servizio momentaneamente non disponibile. Riprova tra poco.',
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Readonly<Record<string, string>>
  readonly code: string | null
  readonly retryAfterSeconds: number | null
  /** true se il body aveva un "detail": serve a distinguere i 403 applicativi da quelli del CSRF. */
  readonly hasDetail: boolean

  constructor(status: number, message: string, options: Partial<Omit<ApiError, 'status' | 'message'>> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = options.fieldErrors ?? {}
    this.code = options.code ?? null
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
    this.hasDetail = options.hasDetail ?? false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string): unknown {
  if (text === '') {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    // Non e' JSON (es. pagina HTML di un proxy): si usa il messaggio generico.
    return null
  }
}

function stringEntries(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!isRecord(value)) {
    return result
  }
  for (const [key, message] of Object.entries(value)) {
    if (typeof message === 'string') {
      result[key] = message
    }
  }
  return result
}

function parseRetryAfter(header: string | null): number | null {
  if (header === null) {
    return null
  }
  const seconds = Number.parseInt(header, 10)
  if (Number.isNaN(seconds)) {
    return null
  }
  return seconds
}

/** Da risposta HTTP non-2xx a ApiError. Il body e' input esterno: si controlla ogni campo. */
export function parseProblem(status: number, bodyText: string, retryAfter: string | null): ApiError {
  const body = parseJson(bodyText)
  let message = STATUS_MESSAGES[status] ?? `Errore ${status}`
  let hasDetail = false
  let code: string | null = null
  let fieldErrors: Record<string, string> = {}
  if (isRecord(body)) {
    if (typeof body.detail === 'string' && body.detail !== '') {
      message = body.detail
      hasDetail = true
    }
    if (typeof body.code === 'string') {
      code = body.code
    }
    fieldErrors = stringEntries(body.errors)
  }
  return new ApiError(status, message, {
    fieldErrors,
    code,
    hasDetail,
    retryAfterSeconds: parseRetryAfter(retryAfter),
  })
}

/** Testo da mostrare all'utente per qualsiasi errore. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error && error.message !== '') {
    return error.message
  }
  return 'Si è verificato un errore imprevisto.'
}

/** Toast di errore; il 401 lo gestisce gia' il redirect al login. */
export function showError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    return
  }
  toast.error(errorMessage(error))
}
