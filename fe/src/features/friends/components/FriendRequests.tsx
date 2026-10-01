import { PaperPlaneTiltIcon, TrayIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errors'
import { formatRelative } from '@/lib/format'
import type { FriendRequestResponse } from '@/lib/types'
import {
  useAcceptFriendRequest,
  useReceivedRequests,
  useRejectFriendRequest,
  useRemoveFriendship,
  useSentRequests,
} from '../hooks/useFriends'
import { ROW_CLASS, RowsSkeleton } from './RowsSkeleton'
import { UserLine } from './UserLine'

/** Da quale evento nasce la richiesta (si diventa amici solo tra partecipanti, D12) e quando. */
function RequestOrigin({ request }: { request: FriendRequestResponse }) {
  const when = <time dateTime={request.createdAt}>{formatRelative(request.createdAt)}</time>
  if (request.eventId === null || request.eventTitle === null) {
    return when
  }
  return (
    <>
      <Link
        to={`/events/${request.eventId}`}
        className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {request.eventTitle}
      </Link>
      {' · '}
      {when}
    </>
  )
}

function ReceivedRow({ request }: { request: FriendRequestResponse }) {
  const accept = useAcceptFriendRequest()
  const reject = useRejectFriendRequest()
  const busy = accept.isPending || reject.isPending
  const name = `${request.user.firstName} ${request.user.lastName}`
  return (
    <li className={ROW_CLASS}>
      <UserLine user={request.user}>
        <RequestOrigin request={request} />
      </UserLine>
      <div className="flex items-center gap-2">
        {/* 409 = non piu' in attesa (ritirata nel frattempo): toast, e la lista si rilegge da sola. */}
        <Button size="sm" disabled={busy} aria-label={`Accetta la richiesta di ${name}`} onClick={() => accept.mutate(request.id, { onError: showError })}>
          Accetta
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          aria-label={`Rifiuta la richiesta di ${name}`}
          onClick={() => reject.mutate(request.id, { onError: showError })}
        >
          Rifiuta
        </Button>
      </div>
    </li>
  )
}

/** Scheda "Ricevute": richieste in attesa di risposta. */
export function ReceivedRequests() {
  const [page, setPage] = useState(0)
  const requests = useReceivedRequests(page)
  return (
    <QueryState
      query={requests}
      loading={<RowsSkeleton label="Caricamento richieste ricevute…" />}
      isEmpty={(data) => data.content.length === 0}
      empty={<EmptyState icon={<TrayIcon />} title="Nessuna richiesta in attesa" description="Le richieste di amicizia che ricevi compaiono qui." />}
    >
      {(data) => (
        <>
          <ul className="grid gap-3">
            {data.content.map((request) => (
              <ReceivedRow key={request.id} request={request} />
            ))}
          </ul>
          <Pagination page={data.page} onPageChange={setPage} />
        </>
      )}
    </QueryState>
  )
}

function SentRow({ request }: { request: FriendRequestResponse }) {
  const withdraw = useRemoveFriendship()
  const name = `${request.user.firstName} ${request.user.lastName}`
  return (
    <li className={ROW_CLASS}>
      <UserLine user={request.user}>
        <RequestOrigin request={request} />
      </UserLine>
      {/* Niente conferma: una richiesta ritirata si puo' rimandare dalla lista partecipanti. */}
      <Button
        variant="ghost"
        size="sm"
        disabled={withdraw.isPending}
        aria-label={`Ritira la richiesta a ${name}`}
        onClick={() => withdraw.mutate(request.id, { onError: showError })}
      >
        Ritira
      </Button>
    </li>
  )
}

/** Scheda "Inviate": richieste a cui l'altro non ha ancora risposto. */
export function SentRequests() {
  const [page, setPage] = useState(0)
  const requests = useSentRequests(page)
  return (
    <QueryState
      query={requests}
      loading={<RowsSkeleton label="Caricamento richieste inviate…" />}
      isEmpty={(data) => data.content.length === 0}
      empty={
        <EmptyState
          icon={<PaperPlaneTiltIcon />}
          title="Nessuna richiesta inviata"
          description="Le richieste che mandi dalla lista partecipanti di un evento restano qui finché non ricevono risposta."
        />
      }
    >
      {(data) => (
        <>
          <ul className="grid gap-3">
            {data.content.map((request) => (
              <SentRow key={request.id} request={request} />
            ))}
          </ul>
          <Pagination page={data.page} onPageChange={setPage} />
        </>
      )}
    </QueryState>
  )
}
