import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type { AiDescriptionResponse, EventPinResponse, EventRequest, EventResponse, EventSummaryResponse, Page } from '@/lib/types'

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
  pins: (params: EventPinParams) => [...eventKeys.all, 'pins', params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
}

export interface EventPinParams {
  q: string
  city: string
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

/** Segnaposto per la mappa pubblica: stessi filtri della lista, massimo 500, senza paginazione. */
export function getEventPins(params: EventPinParams, signal?: AbortSignal): Promise<EventPinResponse[]> {
  return api<EventPinResponse[]>(`/api/events/map${toQuery({ q: params.q, city: params.city })}`, { signal })
}

// ---- Traccia T3: scrittura (proprietario o MODERATOR; i permessi li controlla il backend).

/** Crea un evento: il proprietario e' l'utente loggato. */
export function createEvent(body: EventRequest): Promise<EventResponse> {
  return api<EventResponse>('/api/events', { method: 'POST', body })
}

/** Sostituisce tutto l'evento, scaletta e marker compresi; i partecipanti ricevono una notifica. */
export function updateEvent(id: string, body: EventRequest): Promise<EventResponse> {
  return api<EventResponse>(`/api/events/${encodeURIComponent(id)}`, { method: 'PUT', body })
}

/** Toglie una foto: la successiva diventa copertina. */
export function deleteEventImage(eventId: string, imageId: string): Promise<void> {
  return api<void>(`/api/events/${encodeURIComponent(eventId)}/images/${encodeURIComponent(imageId)}`, { method: 'DELETE' })
}

/** Toglie la locandina di un artista in scaletta. */
export function deletePoster(eventId: string, artistId: string): Promise<void> {
  return api<void>(`/api/events/${encodeURIComponent(eventId)}/lineup/${encodeURIComponent(artistId)}/poster`, { method: 'DELETE' })
}

/** Proposta di descrizione dell'AI a partire dalla bozza (non salva nulla). */
export function proposeDescription(eventId: string, text: string): Promise<AiDescriptionResponse> {
  return api<AiDescriptionResponse>(`/api/events/${encodeURIComponent(eventId)}/ai-description`, { method: 'POST', body: { text } })
}
