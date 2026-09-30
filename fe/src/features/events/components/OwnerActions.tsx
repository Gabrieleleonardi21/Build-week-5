import { TrackSlot } from '@/components/feedback/TrackSlot'
import type { EventResponse } from '@/lib/types'

export interface OwnerActionsProps {
  event: EventResponse
}

/**
 * TRACCIA T3. Azioni di proprietario e moderatori (la pagina le mostra solo a loro).
 * - Modifica (/events/{id}/edit), Annulla (POST /cancel, con ConfirmDialog), Elimina (DELETE: 409 se ci sono
 *   iscritti -> proporre "Annulla"), Messaggio ai partecipanti (POST /api/events/{id}/messages).
 */
export function OwnerActions({ event }: OwnerActionsProps) {
  return <TrackSlot track="T3 Organizzatore" title={`Gestione di "${event.title}"`} />
}
