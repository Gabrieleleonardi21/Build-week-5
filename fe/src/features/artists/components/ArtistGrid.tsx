import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { ArtistResponse } from '@/lib/types'
import { ArtistImage } from './ArtistImage'

const GRID = 'grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4'
// Prima riga su desktop: caricata subito, le altre immagini in lazy.
const ABOVE_THE_FOLD = 4

interface ArtistGridProps {
  artists: readonly ArtistResponse[]
}

/** Griglia degli artisti: tutta la card e' un link al dettaglio (come EventCard). */
export function ArtistGrid({ artists }: ArtistGridProps) {
  return (
    <ul className={GRID}>
      {artists.map((artist, index) => {
        let loading: 'eager' | 'lazy' = 'lazy'
        if (index < ABOVE_THE_FOLD) {
          loading = 'eager'
        }
        return (
          <li key={artist.id} className="group relative">
            <div className="overflow-hidden rounded-xl">
              <ArtistImage
                imageUrl={artist.imageUrl}
                alt=""
                size={400}
                loading={loading}
                className="transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="mt-3 grid gap-1">
              <h2 className="line-clamp-2 font-semibold text-balance">
                <Link
                  to={`/artists/${artist.id}`}
                  className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {artist.name}
                </Link>
              </h2>
              {artist.genre !== null && <p className="truncate text-sm text-muted-foreground">{artist.genre}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Scheletro con la stessa forma della griglia. */
export function ArtistGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={GRID} aria-label="Caricamento artisti…">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="grid gap-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </li>
      ))}
    </ul>
  )
}
