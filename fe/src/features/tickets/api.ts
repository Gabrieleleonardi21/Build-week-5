import { api } from '@/lib/api'
import { ApiError } from '@/lib/errors'
import { toQuery } from '@/lib/query'
import type { Page, ParticipantResponse, TicketResponse } from '@/lib/types'

// Chiavi della cache dei ticket. ticketKeys.all la invalida anche il tempo reale
// (notifica NEW_PARTICIPANT: l'elenco dei partecipanti e' cambiato).
export const ticketKeys = {
  all: ['tickets'] as const,
  mine: (eventId: string) => [...ticketKeys.all, 'mine', eventId] as const,
  list: (page: number) => [...ticketKeys.all, 'list', page] as const,
  participants: (eventId: string, page: number) => [...ticketKeys.all, 'participants', eventId, page] as const,
}

function eventPath(eventId: string): string {
  return `/api/events/${encodeURIComponent(eventId)}`
}

/** Il mio ticket per l'evento, oppure null: per il backend "non iscritto" e' un 404, non un errore. */
export async function getMyTicket(eventId: string, signal?: AbortSignal): Promise<TicketResponse | null> {
  try {
    return await api<TicketResponse>(`${eventPath(eventId)}/tickets/me`, { signal })
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

/** Iscrizione: 409 se gia' iscritti o al completo, 400 se annullato, iniziato o se si e' l'organizzatore. */
export function joinEvent(eventId: string): Promise<TicketResponse> {
  return api<TicketResponse>(`${eventPath(eventId)}/tickets`, { method: 'POST' })
}

/** Annulla l'iscrizione (solo prima dell'inizio: dopo il backend risponde 400). */
export function leaveEvent(eventId: string): Promise<void> {
  return api<void>(`${eventPath(eventId)}/tickets/me`, { method: 'DELETE' })
}

/** I miei ticket validi, paginati. */
export function getMyTickets(page: number, size: number, signal?: AbortSignal): Promise<Page<TicketResponse>> {
  return api<Page<TicketResponse>>(`/api/me/tickets${toQuery({ page, size })}`, { signal })
}

/** Partecipanti: li vedono proprietario, moderatori e gli altri iscritti (per tutti gli altri 403). */
export function getParticipants(
  eventId: string,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<Page<ParticipantResponse>> {
  return api<Page<ParticipantResponse>>(`${eventPath(eventId)}/participants${toQuery({ page, size })}`, { signal })
}
