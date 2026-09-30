import L from 'leaflet'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router'
import { BaseMap } from '@/components/map/BaseMap'
import { venuePinIcon } from '@/components/map/pin-icons'
import { formatDateTime } from '@/lib/format'
import type { EventPinResponse } from '@/lib/types'

// Centro e zoom con tutta l'Italia visibile, quando non ci sono pin.
const ITALY: [number, number] = [42.5, 12.5]
const ITALY_ZOOM = 6
const MAX_FIT_ZOOM = 14

interface EventsMapViewProps {
  pins: readonly EventPinResponse[]
  /** Evento scelto dall'elenco: la mappa ci vola sopra e apre il popup. */
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Adatta lo zoom per far vedere tutti i pin (una volta per ogni nuovo risultato). */
function FitToPins({ pins }: { pins: readonly EventPinResponse[] }) {
  const map = useMap()
  useEffect(() => {
    if (pins.length === 0) {
      map.setView(ITALY, ITALY_ZOOM)
      return
    }
    const bounds = L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: MAX_FIT_ZOOM })
  }, [map, pins])
  return null
}

/** Porta la vista sull'evento scelto e apre il suo popup. */
interface FocusSelectedProps {
  selectedId: string | null
  pins: readonly EventPinResponse[]
  markers: RefObject<Map<string, L.Marker>>
}

function FocusSelected({ selectedId, pins, markers }: FocusSelectedProps) {
  const map = useMap()
  useEffect(() => {
    if (selectedId === null) {
      return
    }
    const pin = pins.find((item) => item.id === selectedId)
    if (pin === undefined) {
      return
    }
    map.flyTo([pin.latitude, pin.longitude], Math.max(map.getZoom(), 13), { duration: 0.6 })
    // Il ref si legge nell'effetto, non durante il render.
    markers.current.get(selectedId)?.openPopup()
  }, [map, pins, markers, selectedId])
  return null
}

export function EventsMapView({ pins, selectedId, onSelect }: EventsMapViewProps) {
  // Riferimenti ai marker per aprire il popup dall'elenco (non causano nuovi render).
  const markers = useRef(new Map<string, L.Marker>())
  // Un'icona PER PIN, creata una volta per risultato:
  // - l'icona contiene un elemento DOM (make()) e un elemento puo' stare in un solo punto della pagina:
  //   condivisa tra piu' marker resterebbe visibile solo sull'ultimo;
  // - se cambiasse a ogni render react-leaflet la sostituirebbe e il popup aperto con un clic si chiuderebbe.
  const icons = useMemo(() => new Map(pins.map((pin) => [pin.id, venuePinIcon()])), [pins])

  return (
    <BaseMap center={ITALY} zoom={ITALY_ZOOM} label="Mappa degli eventi" className="h-full">
      <FitToPins pins={pins} />
      <FocusSelected selectedId={selectedId} pins={pins} markers={markers} />
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.latitude, pin.longitude]}
          icon={icons.get(pin.id)}
          title={pin.title}
          alt={pin.title}
          eventHandlers={{ click: () => onSelect(pin.id) }}
          ref={(marker) => {
            if (marker === null) {
              markers.current.delete(pin.id)
            } else {
              markers.current.set(pin.id, marker)
            }
          }}
        >
          {/* Contenuto React: titolo e citta' restano testo, mai HTML. */}
          <Popup>
            <div className="grid gap-1">
              <Link to={`/events/${pin.id}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
                {pin.title}
              </Link>
              <time dateTime={pin.startsAt} className="text-xs text-muted-foreground">
                {formatDateTime(pin.startsAt)}
              </time>
              <span className="text-xs text-muted-foreground">{pin.city}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </BaseMap>
  )
}
