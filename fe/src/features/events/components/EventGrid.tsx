import { motion } from 'motion/react'
import { Skeleton } from '@/components/ui/skeleton'
import type { EventSummaryResponse } from '@/lib/types'
import { EventCard } from './EventCard'

// Quante card sono visibili senza scorrere su desktop: caricate subito, le altre in lazy.
const ABOVE_THE_FOLD = 3

interface EventGridProps {
  events: readonly EventSummaryResponse[]
}

/** Griglia delle card: 1 colonna su mobile, 2 su tablet, 3 su desktop. */
export function EventGrid({ events }: EventGridProps) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        // Ingresso leggero e in sequenza: comunica che la lista e' arrivata (si spegne con "riduci movimento").
        <motion.li
          key={event.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <EventCard event={event} priority={index < ABOVE_THE_FOLD} />
        </motion.li>
      ))}
    </ul>
  )
}

/** Scheletro con la stessa forma della griglia (niente spinner generici). */
export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" aria-label="Caricamento eventi…">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="grid gap-3">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </li>
      ))}
    </ul>
  )
}
