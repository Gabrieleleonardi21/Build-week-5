import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type { EventSummaryResponse, OwnerMessageRequest, Page } from '@/lib/types'
import { eventKeys } from './api'

// Endpoint della gestione (proprietario e moderatori): i miei eventi, annulla, elimina, messaggio.

export interface MyEventsParams {
  /** Pagina da 0, come il backend. */
  page: number
  size?: number
}

// Sotto eventKeys.all: chi invalida tutti gli eventi (es. dopo un salvataggio) aggiorna anche questa lista.
export const myEventKeys = {
  all: [...eventKeys.all, 'mine'] as const,
  list: (params: MyEventsParams) => [...myEventKeys.all, params] as const,
}

/** Eventi creati dall'utente, anche passati e annullati (GET /api/me/events). */
export function getMyEvents(params: MyEventsParams, signal?: AbortSignal): Promise<Page<EventSummaryResponse>> {
  return api<Page<EventSummaryResponse>>(`/api/me/events${toQuery({ page: params.page, size: params.size })}`, { signal })
}

/** L'evento resta visibile come CANCELLED e gli iscritti ricevono una notifica. */
export function cancelEvent(id: string): Promise<void> {
  return api<void>(`/api/events/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
}

/** Solo senza iscritti: con ticket validi il backend risponde 409 (l'evento va annullato). */
export function deleteEvent(id: string): Promise<void> {
  return api<void>(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Notifica OWNER_MESSAGE a tutti i partecipanti: solo il proprietario (403 anche per i moderatori). */
export function sendOwnerMessage(eventId: string, body: OwnerMessageRequest): Promise<void> {
  return api<void>(`/api/events/${encodeURIComponent(eventId)}/messages`, { method: 'POST', body })
}
