import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type { EventResponse, EventSummaryResponse, Page } from '@/lib/types'

export interface EventSearchParams {
  q: string
  city: string
  /** Pagina da 0, come il backend. */
  page: number
  size?: number
}

// Chiavi della cache degli eventi: le usano le pagine e l'upload manager (copertina cambiata).
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (params: EventSearchParams) => [...eventKeys.lists(), params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
}

/** Eventi pubblicati e non ancora finiti, dal piu' vicino (GET /api/events). */
export function searchEvents(params: EventSearchParams, signal?: AbortSignal): Promise<Page<EventSummaryResponse>> {
  const query = toQuery({ q: params.q, city: params.city, page: params.page, size: params.size })
  return api<Page<EventSummaryResponse>>(`/api/events${query}`, { signal })
}

/** Dettaglio completo: foto, scaletta, marker, organizzatore (visibile anche se annullato). */
export function getEvent(id: string, signal?: AbortSignal): Promise<EventResponse> {
  return api<EventResponse>(`/api/events/${encodeURIComponent(id)}`, { signal })
}
