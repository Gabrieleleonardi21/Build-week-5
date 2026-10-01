import { getCsrfToken, refreshCsrf } from './csrf'
import { API_BASE } from './env'
import { ApiError, parseProblem } from './errors'

// Upload di immagini verso il backend, che le carica su Cloudinary (le chiavi restano sul server).
// XMLHttpRequest e non fetch: fetch non espone l'avanzamento dell'invio, serve per la barra.
export const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// I modelli lenti o le connessioni mobili possono metterci molto: oltre 2 minuti si rinuncia.
const TIMEOUT_MS = 120_000

/** Stessi controlli del backend, fatti prima di inviare: messaggio in italiano oppure null. */
export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) {
    return `${file.name}: formati ammessi JPEG, PNG o WebP`
  }
  if (file.size === 0) {
    return `${file.name}: il file è vuoto`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: supera i 5 MB`
  }
  return null
}

export interface UploadRequest {
  path: string
  file: File
  signal?: AbortSignal
  /** Percentuale 0-100 dei byte inviati. */
  onProgress?: (percent: number) => void
  /** File inviato del tutto: da qui il backend sta caricando su Cloudinary. */
  onSent?: () => void
}

interface RawResponse {
  status: number
  text: string
  retryAfter: string | null
}

function abortError(): DOMException {
  return new DOMException('Caricamento annullato', 'AbortError')
}

function sendOnce(request: UploadRequest, csrfToken: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    if (request.signal?.aborted === true) {
      reject(abortError())
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}${request.path}`)
    xhr.withCredentials = true
    xhr.timeout = TIMEOUT_MS
    xhr.setRequestHeader('X-XSRF-TOKEN', csrfToken)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && request.onProgress !== undefined) {
        request.onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.upload.onload = () => {
      request.onSent?.()
    }
    xhr.onload = () => {
      resolve({ status: xhr.status, text: xhr.responseText, retryAfter: xhr.getResponseHeader('Retry-After') })
    }
    xhr.onerror = () => reject(new ApiError(0, 'Connessione persa durante il caricamento'))
    xhr.ontimeout = () => reject(new ApiError(0, 'Il caricamento sta impiegando troppo, riprova'))
    xhr.onabort = () => reject(abortError())

    const onAbort = () => xhr.abort()
    request.signal?.addEventListener('abort', onAbort, { once: true })
    xhr.onloadend = () => request.signal?.removeEventListener('abort', onAbort)

    // Campo "file": e' il nome atteso da @RequestPart("file") nei controller.
    const form = new FormData()
    form.append('file', request.file)
    xhr.send(form)
  })
}

/**
 * Carica un file e restituisce il JSON della risposta.
 * Come api(): un 403 senza "detail" e' il filtro CSRF, si rilegge il token e si riprova una volta.
 */
export async function uploadFile<T>(request: UploadRequest): Promise<T> {
  let response = await sendOnce(request, await getCsrfToken())
  if (response.status === 403 && !parseProblem(403, response.text, null).hasDetail) {
    response = await sendOnce(request, await refreshCsrf())
  }
  if (response.status < 200 || response.status >= 300) {
    throw parseProblem(response.status, response.text, response.retryAfter)
  }
  return JSON.parse(response.text) as T
}
