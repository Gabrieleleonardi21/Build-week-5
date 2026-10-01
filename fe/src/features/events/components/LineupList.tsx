import { Link } from 'react-router'
import { formatTimeRange } from '@/lib/format'
import type { LineupEntryResponse } from '@/lib/types'

interface LineupListProps {
  lineup: readonly LineupEntryResponse[]
}

/** Scaletta della serata in ordine di esibizione, con orari e locandina se c'e'. */
export function LineupList({ lineup }: LineupListProps) {
  return (
    <ol className="grid gap-3">
      {lineup.map((entry) => {
        const time = formatTimeRange(entry.performanceStart, entry.performanceEnd)
        return (
          <li key={entry.artistId} className="flex items-center gap-4 rounded-xl border p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted font-mono text-sm tabular-nums" aria-hidden="true">
              {entry.performanceOrder}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                <Link to={`/artists/${entry.artistId}`} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  {entry.artistName}
                </Link>
              </p>
              {entry.genre !== null && <p className="truncate text-sm text-muted-foreground">{entry.genre}</p>}
            </div>
            {time !== '' && (
              <p className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                <span className="sr-only">Orario: </span>
                {time}
              </p>
            )}
            {entry.posterUrl !== null && (
              <img
                src={entry.posterUrl}
                alt={`Locandina di ${entry.artistName}`}
                width={48}
                height={64}
                loading="lazy"
                className="h-16 w-12 shrink-0 rounded-md object-cover"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
