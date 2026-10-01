import { TicketIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Pagination } from '@/components/data/Pagination'
import { StatusBadge } from '@/components/data/StatusBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { formatDateTime } from '@/lib/format'
import type { EventSummaryResponse, TicketResponse } from '@/lib/types'
import { useMyTickets } from '../hooks/useTickets'

// Nessun filtro, solo la pagina nell'URL (?page=2): Indietro e ricarica tornano dove si era.
const NO_FILTERS = [] as const
const PAGE_SIZE = 12

function place(event: EventSummaryResponse): string {
  if (event.venueName === null) {
    return event.city
  }
  return `${event.venueName}, ${event.city}`
}

function TicketCard({ ticket }: { ticket: TicketResponse }) {
  const { event } = ticket
  return (
    <article className="relative grid gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="grid gap-1">
        <time dateTime={event.startsAt} className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatDateTime(event.startsAt)}
        </time>
        <h2 className="line-clamp-2 font-semibold text-balance">
          {/* Il link copre tutta la card (after:inset-0), come in EventCard. */}
          <Link
            to={`/events/${event.id}`}
            className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {event.title}
          </Link>
        </h2>
        <p className="truncate text-sm text-muted-foreground">{place(event)}</p>
        <StatusBadge status={event.status} endsAt={event.endsAt ?? event.startsAt} />
      </div>
      {/* Bordo tratteggiato: il "talloncino" del ticket, col codice da mostrare all'ingresso. */}
      <p className="flex items-center justify-between gap-3 border-t border-dashed pt-3 text-sm text-muted-foreground">
        Codice
        <span className="font-mono text-base font-medium tracking-wider text-foreground">{ticket.code}</span>
      </p>
    </article>
  )
}

function TicketsSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Caricamento ticket…">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="grid gap-3 rounded-xl border p-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-full" />
        </li>
      ))}
    </ul>
  )
}

/** I miei ticket validi (/me/tickets): un ticket = un'iscrizione (D09). */
export function MyTicketsPage() {
  const filters = useUrlFilters(NO_FILTERS)
  const tickets = useMyTickets(filters.page, PAGE_SIZE)

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 pb-16">
      <title>I miei ticket · Eventi</title>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">I miei ticket</h1>
        <p className="text-sm text-muted-foreground">Gli eventi a cui sei iscritto. Il codice è lo stesso che hai ricevuto per email.</p>
      </header>
      <QueryState
        query={tickets}
        loading={<TicketsSkeleton />}
        isEmpty={(data) => data.content.length === 0}
        empty={
          <EmptyState
            icon={<TicketIcon />}
            title="Non hai ancora ticket"
            description="Quando ti iscrivi a un evento il ticket compare qui."
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
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.content.map((ticket) => (
                <li key={ticket.id}>
                  <TicketCard ticket={ticket} />
                </li>
              ))}
            </ul>
            <Pagination page={data.page} onPageChange={filters.setPage} />
          </>
        )}
      </QueryState>
    </div>
  )
}
