import 'leaflet/dist/leaflet.css'
import { useEffect, type ReactNode } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { cn } from '@/lib/utils'

/**
 * Leaflet calcola le tessere sulla misura del contenitore al momento della creazione: se poi il
 * contenitore cambia (griglia che si assesta, rotazione del telefono, tab) la mappa resta grigia.
 * Qui si ricalcola a ogni cambio di misura.
 */
function KeepSizeInSync() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

interface BaseMapProps {
  center: [number, number]
  zoom?: number
  /** Etichetta per gli screen reader (la mappa in se' non e' leggibile). */
  label: string
  className?: string
  children?: ReactNode
}

/**
 * Mappa OpenStreetMap condivisa (dettaglio evento, mappa pubblica, form).
 * isolate: i livelli interni di Leaflet (z-index fino a 1000) restano sotto header, dialog e toast.
 */
export function BaseMap({ center, zoom = 16, label, className, children }: BaseMapProps) {
  return (
    <div role="region" aria-label={label} className={cn('isolate overflow-hidden rounded-xl border', className)}>
      {/* scrollWheelZoom off: scorrendo la pagina la rotella non "resta incastrata" nella mappa. */}
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full min-h-72 w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <KeepSizeInSync />
        {children}
      </MapContainer>
    </div>
  )
}
