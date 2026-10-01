import type { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet'
import { useEffect, useMemo } from 'react'
import { Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { BaseMap } from '@/components/map/BaseMap'
import { MARKER_LABELS, markerIcon, venuePinIcon } from '@/components/map/pin-icons'
import type { MarkerKind } from '@/lib/types'

/** Cosa mette il prossimo clic sulla mappa: il luogo dell'evento oppure un marker di quel tipo. */
export type PickMode = 'venue' | MarkerKind

export interface PickerMarker {
  kind: MarkerKind
  label: string
  position: [number, number]
}

interface LocationPickerProps {
  /** null finche' il luogo non e' stato scelto. */
  venue: [number, number] | null
  markers: readonly PickerMarker[]
  onPick: (latitude: number, longitude: number) => void
  /** Il pin del luogo si puo' anche trascinare. */
  onVenueMove: (latitude: number, longitude: number) => void
  disabled?: boolean
}

// Senza luogo si parte dall'Italia intera; con il luogo, dalla via.
const ITALY: [number, number] = [42.5, 12.5]
const COUNTRY_ZOOM = 6
const STREET_ZOOM = 16

function ClickToPick({ onPick, disabled }: { onPick: (latitude: number, longitude: number) => void; disabled: boolean }) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      if (!disabled) {
        onPick(event.latlng.lat, event.latlng.lng)
      }
    },
  })
  return null
}

/** Se le coordinate cambiano dai campi di testo e il pin esce dall'inquadratura, la mappa lo segue. */
function FollowVenue({ venue }: { venue: [number, number] | null }) {
  const map = useMap()
  const latitude = venue?.[0]
  const longitude = venue?.[1]
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      return
    }
    if (!map.getBounds().contains([latitude, longitude])) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), STREET_ZOOM - 2))
    }
  }, [map, latitude, longitude])
  return null
}

/** Mappa del form evento: clic per mettere il luogo o un marker (D08). */
export function LocationPicker({ venue, markers, onPick, onVenueMove, disabled = false }: LocationPickerProps) {
  // Una icona per marker (pin-icons.ts): l'elemento DOM dentro non si condivide. Si ricreano solo
  // quando cambiano numero o tipi, non a ogni tasto premuto nel form.
  const kinds = markers.map((marker) => marker.kind).join(',')
  const icons = useMemo(() => {
    if (kinds === '') {
      return []
    }
    return kinds.split(',').map((kind) => markerIcon(kind as MarkerKind))
  }, [kinds])
  const venueIcon = useMemo(() => venuePinIcon(), [])

  let zoom = COUNTRY_ZOOM
  if (venue !== null) {
    zoom = STREET_ZOOM
  }

  return (
    <BaseMap center={venue ?? ITALY} zoom={zoom} label="Mappa per scegliere il luogo e i marker" className="h-96">
      <ClickToPick onPick={onPick} disabled={disabled} />
      <FollowVenue venue={venue} />
      {venue !== null && (
        <Marker
          position={venue}
          icon={venueIcon}
          draggable={!disabled}
          alt="Luogo dell'evento"
          eventHandlers={{
            dragend: (event) => {
              const point = (event.target as LeafletMarker).getLatLng()
              onVenueMove(point.lat, point.lng)
            },
          }}
        >
          <Tooltip>Luogo dell'evento</Tooltip>
        </Marker>
      )}
      {markers.map((marker, index) => {
        const icon = icons[index]
        if (icon === undefined) {
          return null
        }
        let label = MARKER_LABELS[marker.kind]
        if (marker.label !== '') {
          label = marker.label
        }
        return (
          <Marker key={`${index}-${marker.kind}`} position={marker.position} icon={icon} alt={MARKER_LABELS[marker.kind]}>
            {/* Testo in React: le etichette scritte dagli utenti non diventano mai HTML. */}
            <Tooltip>{label}</Tooltip>
          </Marker>
        )
      })}
    </BaseMap>
  )
}
