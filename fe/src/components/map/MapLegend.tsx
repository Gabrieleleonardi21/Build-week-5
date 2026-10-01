import type { MarkerKind } from '@/lib/types'
import { MARKER_LABELS } from './pin-icons'

const ORDER: readonly MarkerKind[] = ['ENTRANCE', 'EXIT', 'EMERGENCY_EXIT']

const SWATCH: Readonly<Record<MarkerKind, string>> = {
  ENTRANCE: 'bg-marker-entrance',
  EXIT: 'bg-marker-exit',
  EMERGENCY_EXIT: 'bg-marker-emergency',
}

interface MapLegendProps {
  kinds: readonly MarkerKind[]
}

/** Legenda testuale dei marker presenti: il colore da solo non basta (accessibilita'). */
export function MapLegend({ kinds }: MapLegendProps) {
  const present = ORDER.filter((kind) => kinds.includes(kind))
  if (present.length === 0) {
    return null
  }
  return (
    <ul aria-label="Legenda della mappa" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <li className="flex items-center gap-2">
        <span className="size-3 rounded-full bg-primary" aria-hidden="true" />
        Luogo dell'evento
      </li>
      {present.map((kind) => (
        <li key={kind} className="flex items-center gap-2">
          <span className={`size-3 rounded-full ${SWATCH[kind]}`} aria-hidden="true" />
          {MARKER_LABELS[kind]}
        </li>
      ))}
    </ul>
  )
}
