import { Marker, Tooltip } from 'react-leaflet'
import { BaseMap } from '@/components/map/BaseMap'
import { MapLegend } from '@/components/map/MapLegend'
import { MARKER_LABELS, markerIcon, venuePinIcon } from '@/components/map/pin-icons'
import type { EventResponse } from '@/lib/types'

interface EventLocationMapProps {
  event: EventResponse
}

/** Luogo dell'evento con ingressi, uscite e uscite di emergenza (D08). */
export function EventLocationMap({ event }: EventLocationMapProps) {
  const center: [number, number] = [event.latitude, event.longitude]
  return (
    <div className="grid gap-3">
      <BaseMap center={center} label={`Mappa di ${event.venueName ?? event.address}`} className="h-80">
        <Marker position={center} icon={venuePinIcon()} title={event.venueName ?? event.address} alt="Luogo dell'evento">
          {/* Testo in React: nomi e indirizzi non diventano mai HTML. */}
          <Tooltip>{event.venueName ?? event.address}</Tooltip>
        </Marker>
        {event.markers.map((marker) => {
          const label = marker.label ?? MARKER_LABELS[marker.kind]
          return (
            <Marker key={marker.id} position={[marker.latitude, marker.longitude]} icon={markerIcon(marker.kind)} title={label} alt={MARKER_LABELS[marker.kind]}>
              <Tooltip>{label}</Tooltip>
            </Marker>
          )
        })}
      </BaseMap>
      <MapLegend kinds={event.markers.map((marker) => marker.kind)} />
    </div>
  )
}
