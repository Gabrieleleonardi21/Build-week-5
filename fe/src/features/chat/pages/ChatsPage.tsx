import { ChatsCircleIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useAuth } from '@/components/auth/auth-context'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { ChatListItem } from '../components/ChatListItem'
import { useInbox } from '../hooks/useChat'

// Nessun filtro: nell'URL c'e' solo la pagina.
const NO_FILTERS = [] as const
const SKELETON_ROWS = 4

function InboxSkeleton() {
  return (
    <ul className="grid gap-3" aria-label="Caricamento chat…">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center gap-4 rounded-xl border p-4">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Inbox: le conversazioni con almeno un messaggio; si aggiorna in tempo reale (RealtimeProvider). */
export function ChatsPage() {
  const { user } = useAuth()
  const filters = useUrlFilters(NO_FILTERS)
  const inbox = useInbox(filters.page)
  const meId = user?.id ?? ''

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 pb-16">
      <title>Chat · Eventi</title>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Chat</h1>
        <p className="text-sm text-muted-foreground">Le conversazioni con i tuoi amici.</p>
      </header>
      <QueryState
        query={inbox}
        loading={<InboxSkeleton />}
        isEmpty={(data) => data.content.length === 0}
        empty={
          <EmptyState
            icon={<ChatsCircleIcon />}
            title="Nessuna conversazione"
            description="Puoi scrivere agli amici: scegline uno dalla tua lista per iniziare."
            action={
              <Button asChild>
                <Link to="/friends">Vai agli amici</Link>
              </Button>
            }
          />
        }
      >
        {(data) => (
          <>
            <ul className="grid gap-3">
              {data.content.map((chat) => (
                <ChatListItem key={chat.chatId} chat={chat} meId={meId} />
              ))}
            </ul>
            <Pagination page={data.page} onPageChange={filters.setPage} />
          </>
        )}
      </QueryState>
    </div>
  )
}
