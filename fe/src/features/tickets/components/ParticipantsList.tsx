import { TrackSlot } from '@/components/feedback/TrackSlot'

export interface ParticipantsListProps {
  eventId: string
}

/**
 * TRACCIA T4. Partecipanti (GET /api/events/{id}/participants, paginato).
 * Li vedono proprietario, moderatori e partecipanti; per gli altri il backend risponde 403:
 * in quel caso non mostrare nulla. Da qui parte la richiesta di amicizia (AddFriendButton).
 */
export function ParticipantsList({ eventId }: ParticipantsListProps) {
  return <TrackSlot track="T4 Social" title={`Partecipanti dell'evento ${eventId.slice(0, 8)}…`} />
}
