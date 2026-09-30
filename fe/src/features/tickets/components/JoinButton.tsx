import { TrackSlot } from '@/components/feedback/TrackSlot'
import type { EventResponse } from '@/lib/types'

export interface JoinButtonProps {
  event: EventResponse
}

/**
 * TRACCIA T4. Iscrizione / annullamento per l'utente loggato.
 * - GET /api/events/{id}/tickets/me (404 = non iscritto), POST per iscriversi, DELETE per annullare.
 * - Anonimo: link al login con ritorno qui. Evento annullato o iniziato: bottone disabilitato con motivo.
 * - 409: "gia' iscritto" o "evento al completo". Dopo l'iscrizione invalidare eventKeys.detail(event.id).
 */
export function JoinButton({ event }: JoinButtonProps) {
  return <TrackSlot track="T4 Social" title={`Iscrizione a "${event.title}"`} />
}
