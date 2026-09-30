import { MapPinIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { formatDateTime } from '@/lib/format'
import type { EventPinResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EventFilters } from '../components/EventFilters'
import { EventsMapView } from '../components/EventsMapView'
import { useEventPins } from '../hooks/useEventPins'

const FILTER_KEYS = ['q', 'city'] as const

function countLabel(total: number): string {
  if (total === 1) {
    return '1 evento sulla mappa'
  }
  return `${total} eventi sulla mappa`
}

interface PinListProps {
  pins: readonly EventPinResponse[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Elenco accanto alla mappa: la stessa informazione, usabile anche da tastiera e screen reader. */
function PinList({ pins, selectedId, onSelect }: PinListProps) {
  return (
    <ul className="grid gap-2">
      {pins.map((pin) => (
        <li key={pin.id}>
          <button
            type="button"
            onClick={() => onSelect(pin.id)}
            aria-pressed={pin.id === selectedId}
            className={cn(
              'grid w-full gap-0.5 rounded-xl border p-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50',
              pin.id === selectedId && 'border-primary bg-muted',
            )}
          >
            <span className="font-medium">{pin.title}</span>
            <span className="text-xs text-muted-foreground">
              <time dateTime={pin.startsAt}>{formatDateTime(pin.startsAt)}</time>, {pin.city}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Mappa pubblica degli eventi (Parte 5): stessi filtri della home, nell'URL. */
export function EventsMapPage() {
  const filters = useUrlFilters(FILTER_KEYS)
  const { q, city } = filters.values
  const pins = useEventPins({ q, city })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  let count = null
  if (pins.data !== undefined && pins.data.length > 0) {
    count = (
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {countLabel(pins.data.length)}
      </p>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 pb-16">
      <title>Mappa eventi · Eventi</title>
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Mappa degli eventi</h1>
        <p className="text-muted-foreground">Gli eventi in arrivo in tutta Italia. Tocca un pin per i dettagli.</p>
      </div>
      <EventFilters values={{ q, city }} onSearch={(next) => filters.setFilters(next)} onClear={filters.clear} />
      {count}
      <QueryState
        query={pins}
        loading={<Skeleton className="h-[60dvh] w-full rounded-xl" />}
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            icon={<MapPinIcon />}
            title="Nessun evento da mostrare"
            description="Prova un'altra città o una parola diversa, oppure cancella i filtri qui sopra."
          />
        }
      >
        {(data) => (
          // Su mobile prima la mappa, poi l'elenco; da lg elenco a sinistra e mappa a destra.
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            {/* Altezza esplicita fin dal primo render: Leaflet adatta lo zoom alla misura che trova subito. */}
            <div className="h-[60dvh] lg:order-2 lg:h-[70dvh]">
              <EventsMapView pins={data} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <div className="lg:order-1 lg:h-[70dvh] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <PinList pins={data} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>
        )}
      </QueryState>
    </div>
  )
}
