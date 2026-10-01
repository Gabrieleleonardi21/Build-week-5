import { CalendarBlankIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/data/StatusBadge'
import { formatDateTime } from '@/lib/format'
import type { EventSummaryResponse } from '@/lib/types'

interface EventCardProps {
  event: EventSummaryResponse
  /** Le prime card sono sopra la piega: si caricano subito, le altre quando servono. */
  priority?: boolean
}

function place(event: EventSummaryResponse): string {
  if (event.venueName === null) {
    return event.city
  }
  return `${event.venueName}, ${event.city}`
}

/** Card di un evento nelle liste: tutta la card e' un link al dettaglio. */
export function EventCard({ event, priority = false }: EventCardProps) {
  let loading: 'eager' | 'lazy' = 'lazy'
  if (priority) {
    loading = 'eager'
  }

  let cover = (
    <div className="grid aspect-[4/3] place-items-center bg-muted text-muted-foreground" aria-hidden="true">
      <CalendarBlankIcon size={32} />
    </div>
  )
  if (event.coverUrl !== null) {
    cover = (
      <img
        src={event.coverUrl}
        alt=""
        width={600}
        height={450}
        loading={loading}
        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    )
  }

  return (
    <article className="group relative">
      <div className="overflow-hidden rounded-xl">{cover}</div>
      <div className="mt-3 grid gap-1">
        <time dateTime={event.startsAt} className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatDateTime(event.startsAt)}
        </time>
        <h3 className="line-clamp-2 font-semibold text-balance">
          {/* Il link copre tutta la card (after:inset-0): un solo elemento cliccabile, niente link annidati. */}
          <Link
            to={`/events/${event.id}`}
            className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {event.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-muted-foreground">{place(event)}</p>
        <StatusBadge status={event.status} endsAt={event.endsAt ?? event.startsAt} />
      </div>
    </article>
  )
}
