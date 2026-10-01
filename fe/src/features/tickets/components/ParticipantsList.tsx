import { useState } from 'react'
import { useAuth } from '@/components/auth/auth-context'
import { Pagination } from '@/components/data/Pagination'
import { QueryState } from '@/components/feedback/QueryState'
import { Skeleton } from '@/components/ui/skeleton'
import { AddFriendButton } from '@/features/friends/components/AddFriendButton'
import { UserLine } from '@/features/friends/components/UserLine'
import { ApiError } from '@/lib/errors'
import { useParticipants } from '../hooks/useTickets'

export interface ParticipantsListProps {
  eventId: string
}

const PAGE_SIZE = 12

function ParticipantsSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="Caricamento partecipanti…">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 rounded-xl border p-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </li>
      ))}
    </ul>
  )
}

/**
 * TRACCIA T4. Partecipanti dell'evento, da cui parte la richiesta di amicizia (D12:
 * si diventa amici solo tra partecipanti dello stesso evento).
 * Li vedono proprietario, moderatori e iscritti; per gli altri il backend risponde 403.
 */
export function ParticipantsList({ eventId }: ParticipantsListProps) {
  const { user } = useAuth()
  // Pagina in stato locale e non nell'URL: e' una sezione dentro il dettaglio evento.
  const [page, setPage] = useState(0)
  const participants = useParticipants(eventId, page, PAGE_SIZE)

  if (participants.error instanceof ApiError && participants.error.status === 403) {
    return <p className="text-sm text-muted-foreground">Iscriviti all'evento per vedere chi partecipa.</p>
  }

  return (
    <QueryState
      query={participants}
      loading={<ParticipantsSkeleton />}
      isEmpty={(data) => data.content.length === 0}
      empty={<p className="text-sm text-muted-foreground">Ancora nessun iscritto.</p>}
    >
      {(data) => (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.content.map((participant) => (
              <li key={participant.id} className="flex items-center gap-3 rounded-xl border p-3">
                <UserLine user={participant} />
                {/* A se stessi l'amicizia non si chiede (il backend risponderebbe 400). */}
                {user !== null && user.id !== participant.id && (
                  <AddFriendButton addresseeId={participant.id} eventId={eventId} name={participant.firstName} />
                )}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} onPageChange={setPage} />
        </>
      )}
    </QueryState>
  )
}
