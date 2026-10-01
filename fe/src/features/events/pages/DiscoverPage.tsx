import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import type { EventSummaryResponse, Page } from '@/lib/types'
import { DiscoverHero } from '../components/DiscoverHero'
import { EventFilters } from '../components/EventFilters'
import { EventGrid, EventGridSkeleton } from '../components/EventGrid'
import { useEvents } from '../hooks/useEvents'

const FILTER_KEYS = ['q', 'city'] as const
const PAGE_SIZE = 12

function resultsLabel(total: number): string {
  if (total === 1) {
    return '1 evento'
  }
  return `${total} eventi`
}

function firstWithCover(page: Page<EventSummaryResponse> | undefined): EventSummaryResponse | null {
  if (page === undefined) {
    return null
  }
  return page.content.find((event) => event.coverUrl !== null) ?? null
}

/**
 * Home pubblica: ricerca e lista degli eventi in arrivo.
 * Pagina di riferimento del frontend: query + QueryState, filtri e pagina nell'URL,
 * skeleton con la forma finale, stato vuoto con azione, paginazione.
 */
export function DiscoverPage() {
  const filters = useUrlFilters(FILTER_KEYS)
  const { q, city } = filters.values
  const events = useEvents({ q, city, page: filters.page, size: PAGE_SIZE })

  let featured: EventSummaryResponse | null = null
  // La foto dell'hero e' il prossimo evento senza filtri: non cambia a ogni ricerca.
  if (q === '' && city === '' && filters.page === 0) {
    featured = firstWithCover(events.data)
  }

  // Con zero risultati parla gia' lo stato vuoto: niente "0 eventi" accanto.
  let count = null
  if (events.data !== undefined && events.data.page.totalElements > 0) {
    count = (
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {resultsLabel(events.data.page.totalElements)}
      </p>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16">
      <DiscoverHero
        featured={featured}
        search={
          <EventFilters
            values={{ q, city }}
            onSearch={(next) => filters.setFilters(next)}
            onClear={filters.clear}
          />
        }
      />
      <section aria-labelledby="events-title" className="grid gap-6">
        <div className="flex items-baseline justify-between gap-4 border-t pt-8">
          <h2 id="events-title" className="text-xl font-semibold tracking-tight">
            Prossimi eventi
          </h2>
          {count}
        </div>
        <QueryState
          query={events}
          loading={<EventGridSkeleton />}
          isEmpty={(data) => data.content.length === 0}
          empty={
            <EmptyState
              icon={<MagnifyingGlassIcon />}
              title="Nessun evento trovato"
              description="Prova un'altra città o una parola diversa, oppure cancella i filtri qui sopra."
            />
          }
        >
          {(data) => (
            <>
              <EventGrid events={data.content} />
              <Pagination
                page={data.page}
                onPageChange={(page) => {
                  filters.setPage(page)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </>
          )}
        </QueryState>
      </section>
    </div>
  )
}
