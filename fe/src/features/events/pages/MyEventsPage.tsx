import { CalendarPlusIcon, PlusIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { OwnerEventRow } from '../components/OwnerEventRow'
import { useMyEvents } from '../hooks/useMyEvents'

// Nessun filtro: nell'URL resta solo la pagina (condivisibile, Indietro funziona).
const FILTER_KEYS = [] as const
const PAGE_SIZE = 10

function ListSkeleton() {
  return (
    <ul className="grid gap-3" aria-label="Caricamento dei tuoi eventi…">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 rounded-xl border p-3">
          <Skeleton className="size-20 shrink-0 rounded-lg" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Eventi creati dall'utente, anche passati e annullati: da qui si aprono e si modificano. */
export function MyEventsPage() {
  const filters = useUrlFilters<never>(FILTER_KEYS)
  const events = useMyEvents({ page: filters.page, size: PAGE_SIZE })

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-8 pb-16">
      <title>I miei eventi · Tourevents</title>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">I miei eventi</h1>
          <p className="max-w-prose text-muted-foreground text-pretty">Gli eventi che hai creato, compresi quelli passati e annullati.</p>
        </div>
        <Button asChild>
          <Link to="/events/new">
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Crea evento
          </Link>
        </Button>
      </header>
      <QueryState
        query={events}
        loading={<ListSkeleton />}
        isEmpty={(data) => data.content.length === 0}
        empty={
          <EmptyState
            icon={<CalendarPlusIcon />}
            title="Non hai ancora creato eventi"
            description="Bastano titolo, data e luogo: scaletta e foto si possono aggiungere dopo."
            action={
              <Button asChild>
                <Link to="/events/new">Crea il tuo primo evento</Link>
              </Button>
            }
          />
        }
      >
        {(data) => (
          <>
            <ul className="grid gap-3">
              {data.content.map((event) => (
                <OwnerEventRow key={event.id} event={event} />
              ))}
            </ul>
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
    </div>
  )
}
