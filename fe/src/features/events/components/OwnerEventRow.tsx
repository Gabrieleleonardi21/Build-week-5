import { CalendarBlankIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/data/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import type { EventSummaryResponse } from '@/lib/types'

interface OwnerEventRowProps {
  event: EventSummaryResponse
}

function place(event: EventSummaryResponse): string {
  if (event.venueName === null) {
    return event.city
  }
  return `${event.venueName}, ${event.city}`
}

/** Riga de "I miei eventi": copertina, dati essenziali, stato e accesso diretto alla modifica. */
export function OwnerEventRow({ event }: OwnerEventRowProps) {
  let cover = (
    <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
      <CalendarBlankIcon size={24} />
    </div>
  )
  if (event.coverUrl !== null) {
    cover = <img src={event.coverUrl} alt="" width={80} height={80} loading="lazy" className="size-20 shrink-0 rounded-lg object-cover" />
  }

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl border p-3">
      {cover}
      <div className="grid min-w-0 flex-1 gap-1">
        <time dateTime={event.startsAt} className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatDateTime(event.startsAt)}
        </time>
        <h2 className="truncate font-semibold">
          <Link to={`/events/${event.id}`} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {event.title}
          </Link>
        </h2>
        <p className="truncate text-sm text-muted-foreground">{place(event)}</p>
        <StatusBadge status={event.status} endsAt={event.endsAt ?? event.startsAt} />
      </div>
      {/* Un evento annullato non si modifica piu' (400 dal backend): niente bottone. */}
      {event.status !== 'CANCELLED' && (
        <Button asChild variant="outline">
          <Link to={`/events/${event.id}/edit`} aria-label={`Modifica ${event.title}`}>
            <PencilSimpleIcon data-icon="inline-start" aria-hidden="true" />
            Modifica
          </Link>
        </Button>
      )}
    </li>
  )
}
