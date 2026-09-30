import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/errors'

const MAX_RETRIES = 3

/**
 * Si riprova solo quando ha senso: rete assente o backend in avvio (cold start di Render, 5xx).
 * Un 4xx (401, 403, 404, 409...) non cambia riprovando.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) {
    return false
  }
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500
  }
  return true
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // 30 s: tornando su una pagina appena vista non si rifanno subito le chiamate.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      // Le scritture non si ripetono da sole: si rischierebbe di iscriversi due volte.
      mutations: { retry: false },
    },
  })
}
