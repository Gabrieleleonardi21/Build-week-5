import type { ReactNode } from 'react'

interface TrackSlotProps {
  /** Traccia del team che riempie lo spazio (es. "T4 Social"). */
  track: string
  title: string
  children?: ReactNode
}

/**
 * Spazio riservato a un componente di un'altra traccia, gia' con le sue props.
 * Visibile solo in sviluppo: in produzione non compare nulla finche' non e' implementato.
 */
export function TrackSlot({ track, title, children }: TrackSlotProps) {
  if (!import.meta.env.DEV) {
    return null
  }
  return (
    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p>Da implementare: traccia {track}.</p>
      {children}
    </div>
  )
}
