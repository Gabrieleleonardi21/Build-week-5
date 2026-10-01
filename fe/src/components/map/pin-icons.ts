import L from 'leaflet'
import { make } from '@/lib/dom'
import type { MarkerKind } from '@/lib/types'

// Icone dei pin come HTMLElement costruiti con make(): Leaflet li inserisce cosi' come sono,
// senza mai interpretare stringhe HTML (i testi arrivano dagli utenti: niente XSS).

export const MARKER_LABELS: Readonly<Record<MarkerKind, string>> = {
  ENTRANCE: 'Ingresso',
  EXIT: 'Uscita',
  EMERGENCY_EXIT: 'Uscita di emergenza',
}

// Lettera dentro il cerchio: il tipo si capisce anche senza distinguere i colori.
const MARKER_GLYPHS: Readonly<Record<MarkerKind, string>> = {
  ENTRANCE: 'E',
  EXIT: 'U',
  EMERGENCY_EXIT: '!',
}

const MARKER_CLASSES: Readonly<Record<MarkerKind, string>> = {
  ENTRANCE: 'map-marker map-marker--entrance',
  EXIT: 'map-marker map-marker--exit',
  EMERGENCY_EXIT: 'map-marker map-marker--emergency',
}

/**
 * Pin del luogo dell'evento (goccia con l'accento del tema).
 * Una chiamata = un'icona per UN marker: l'elemento DOM dentro non si puo' condividere tra piu' marker.
 */
export function venuePinIcon(): L.DivIcon {
  const pin = make('div', { className: 'map-pin' }, [make('span', { className: 'map-pin__dot' })])
  return L.divIcon({ html: pin, className: 'map-icon', iconSize: [28, 36], iconAnchor: [14, 34], tooltipAnchor: [0, -30] })
}

/** Cerchio colorato per ingresso, uscita e uscita di emergenza. */
export function markerIcon(kind: MarkerKind): L.DivIcon {
  const circle = make('div', { className: MARKER_CLASSES[kind] }, [make('span', { textContent: MARKER_GLYPHS[kind] })])
  return L.divIcon({ html: circle, className: 'map-icon', iconSize: [26, 26], iconAnchor: [13, 13], tooltipAnchor: [0, -14] })
}
