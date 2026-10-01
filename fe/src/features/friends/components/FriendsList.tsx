import { ChatCircleIcon, UsersIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { FriendResponse } from '@/lib/types'
import { useFriends, useRemoveFriendship } from '../hooks/useFriends'
import { ROW_CLASS, RowsSkeleton } from './RowsSkeleton'
import { UserLine } from './UserLine'

function unreadLabel(count: number): string {
  if (count === 1) {
    return '1 messaggio non letto'
  }
  return `${count} messaggi non letti`
}

function FriendRow({ item }: { item: FriendResponse }) {
  const remove = useRemoveFriendship()
  const { friend } = item
  return (
    <li className={ROW_CLASS}>
      <UserLine user={friend}>Amici dal {formatDate(item.since)}</UserLine>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          {/* friendshipId e' anche l'id della chat. */}
          <Link to={`/chats/${item.friendshipId}`}>
            <ChatCircleIcon data-icon="inline-start" aria-hidden="true" />
            Chat
            {item.unreadMessages > 0 && (
              <Badge className="tabular-nums" aria-label={unreadLabel(item.unreadMessages)}>
                {item.unreadMessages}
              </Badge>
            )}
          </Link>
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" aria-label={`Rimuovi ${friend.firstName} ${friend.lastName} dagli amici`}>
              Rimuovi
            </Button>
          }
          title={`Rimuovere ${friend.firstName} dagli amici?`}
          description="I messaggi già scambiati restano leggibili, ma non potrete più scrivervi finché non tornate amici."
          confirmLabel="Rimuovi"
          destructive
          onConfirm={() => remove.mutateAsync(item.friendshipId)}
        />
      </div>
    </li>
  )
}

/** Scheda "Amici": da qui si apre la chat o si toglie l'amicizia. */
export function FriendsList() {
  const [page, setPage] = useState(0)
  const friends = useFriends(page)
  return (
    <QueryState
      query={friends}
      loading={<RowsSkeleton label="Caricamento amici…" />}
      isEmpty={(data) => data.content.length === 0}
      empty={
        <EmptyState
          icon={<UsersIcon />}
          title="Non hai ancora amici"
          description="Iscriviti a un evento: dalla lista dei partecipanti puoi chiedere l'amicizia a chi ci va con te."
          action={
            <Button asChild>
              <Link to="/">Scopri gli eventi</Link>
            </Button>
          }
        />
      }
    >
      {(data) => (
        <>
          <ul className="grid gap-3">
            {data.content.map((item) => (
              <FriendRow key={item.friendshipId} item={item} />
            ))}
          </ul>
          <Pagination page={data.page} onPageChange={setPage} />
        </>
      )}
    </QueryState>
  )
}
