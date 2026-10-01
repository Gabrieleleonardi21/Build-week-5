import { ArrowRightIcon, MapTrifoldIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import type { EventSummaryResponse } from '@/lib/types'

interface DiscoverHeroProps {
  /** Il prossimo evento con una foto: e' l'immagine dell'hero (una foto vera, non decorazione). */
  featured: EventSummaryResponse | null
  /** Il form di ricerca, messo dentro l'hero: e' l'azione principale della pagina. */
  search: ReactNode
}

/** Hero asimmetrico (testo a sinistra, foto a destra; su mobile una colonna). */
export function DiscoverHero({ featured, search }: DiscoverHeroProps) {
  let visual = null
  if (featured !== null && featured.coverUrl !== null) {
    visual = (
      <motion.figure
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid gap-3"
      >
        <Link
          to={`/events/${featured.id}`}
          className="block overflow-hidden rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <img
            src={featured.coverUrl}
            alt={`Foto di ${featured.title}`}
            width={1200}
            height={800}
            fetchPriority="high"
            className="aspect-[3/2] w-full object-cover"
          />
        </Link>
        <figcaption className="text-sm text-muted-foreground">
          Prossimo: <span className="font-medium text-foreground">{featured.title}</span>,{' '}
          <time dateTime={featured.startsAt}>{formatDateTime(featured.startsAt)}</time>
        </figcaption>
      </motion.figure>
    )
  }

  return (
    <section className="grid items-center gap-10 py-10 md:py-16 lg:grid-cols-[1.1fr_1fr]">
      <div className="grid gap-6">
        <div className="grid gap-4">
          <h1 className="text-4xl font-semibold text-balance md:text-6xl">
            Scopri gli eventi dal vivo in Italia
          </h1>
          <p className="max-w-[52ch] text-lg text-muted-foreground text-pretty">
            Concerti, festival e serate: cerca per città o artista e prenota il tuo posto.
          </p>
        </div>
        {search}
        <Button asChild variant="outline" className="w-fit">
          <Link to="/map">
            <MapTrifoldIcon data-icon="inline-start" aria-hidden="true" />
            Esplora la mappa
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      {visual}
    </section>
  )
}
