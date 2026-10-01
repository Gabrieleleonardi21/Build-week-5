import { z } from 'zod'
import { fromLocalInputValue, toLocalInputValue } from '@/lib/format'
import type { EventRequest, EventResponse, LineupEntryRequest, MarkerKind, MarkerRequest } from '@/lib/types'

// Form evento (traccia T3). Stessi vincoli di EventRequest ed EventService nel backend: l'errore
// arriva subito sotto il campo, in italiano. Nel form tutti i valori sono stringhe (quello che
// producono gli <input>): la conversione verso EventRequest e' in toEventRequest().
export const MAX_LINEUP = 30
export const MAX_MARKERS = 30
export const MARKER_KINDS: readonly MarkerKind[] = ['ENTRANCE', 'EXIT', 'EMERGENCY_EXIT']

function isDateTime(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime())
}

/** '' oppure una data valida. */
function isOptionalDateTime(value: string): boolean {
  return value === '' || isDateTime(value)
}

/** Numero decimale tra min e max; accetta anche la virgola ("45,46"). */
export function parseCoordinate(value: string): number {
  const text = value.trim().replace(',', '.')
  if (text === '') {
    return Number.NaN
  }
  return Number(text)
}

function coordinate(limit: number, message: string) {
  return z.string().refine((value) => {
    const parsed = parseCoordinate(value)
    return !Number.isNaN(parsed) && Math.abs(parsed) <= limit
  }, message)
}

const lineupEntrySchema = z.object({
  artistName: z.string().trim().min(1, "Inserisci il nome dell'artista").max(150, 'Massimo 150 caratteri'),
  performanceStart: z.string().refine(isOptionalDateTime, 'Orario non valido'),
  performanceEnd: z.string().refine(isOptionalDateTime, 'Orario non valido'),
})

const markerSchema = z.object({
  kind: z.enum(['ENTRANCE', 'EXIT', 'EMERGENCY_EXIT']),
  label: z.string().trim().max(100, 'Massimo 100 caratteri'),
  latitude: coordinate(90, 'Latitudine tra -90 e 90'),
  longitude: coordinate(180, 'Longitudine tra -180 e 180'),
})

const baseSchema = z.object({
  title: z.string().trim().min(1, 'Inserisci il titolo').max(150, 'Massimo 150 caratteri'),
  description: z.string().max(10_000, 'Massimo 10.000 caratteri'),
  startsAt: z.string().min(1, "Inserisci data e ora di inizio").refine(isDateTime, 'Data non valida'),
  endsAt: z.string().refine(isOptionalDateTime, 'Data non valida'),
  venueName: z.string().trim().max(150, 'Massimo 150 caratteri'),
  address: z.string().trim().min(1, "Inserisci l'indirizzo").max(255, 'Massimo 255 caratteri'),
  city: z.string().trim().min(1, 'Inserisci la città').max(100, 'Massimo 100 caratteri'),
  province: z.string().trim().regex(/^([A-Za-z]{2})?$/, 'La provincia è una sigla di 2 lettere'),
  latitude: coordinate(90, 'Scegli il punto sulla mappa o scrivi una latitudine tra -90 e 90'),
  longitude: coordinate(180, 'Scegli il punto sulla mappa o scrivi una longitudine tra -180 e 180'),
  maxParticipants: z.string().trim().regex(/^([1-9]\d{0,8})?$/, 'Un numero intero maggiore di zero, oppure vuoto'),
  lineup: z.array(lineupEntrySchema).max(MAX_LINEUP, `Massimo ${MAX_LINEUP} artisti`),
  markers: z.array(markerSchema).max(MAX_MARKERS, `Massimo ${MAX_MARKERS} marker`),
})

export type EventFormValues = z.infer<typeof baseSchema>
export type LineupFormEntry = EventFormValues['lineup'][number]
export type MarkerFormEntry = EventFormValues['markers'][number]

/**
 * Schema del form. savedStartsAt e' l'inizio gia' salvato (valore dell'input), null in creazione:
 * in modifica la data si puo' lasciare com'e' anche se e' gia' passata (EventService.update).
 */
export function eventFormSchema(savedStartsAt: string | null) {
  return baseSchema.superRefine((values, context) => {
    if (isDateTime(values.startsAt) && values.startsAt !== savedStartsAt && new Date(values.startsAt).getTime() <= Date.now()) {
      context.addIssue({ code: 'custom', path: ['startsAt'], message: "L'inizio deve essere nel futuro" })
    }
    if (values.endsAt !== '' && isDateTime(values.endsAt) && isDateTime(values.startsAt) && new Date(values.endsAt) < new Date(values.startsAt)) {
      context.addIssue({ code: 'custom', path: ['endsAt'], message: "La fine non può precedere l'inizio" })
    }
    // Il backend crea gli artisti per nome senza distinguere maiuscole: "Blue Trio" e "blue trio" sono lo stesso.
    const seen = new Set<string>()
    values.lineup.forEach((entry, index) => {
      const name = entry.artistName.trim().toLowerCase()
      if (name !== '' && seen.has(name)) {
        context.addIssue({ code: 'custom', path: ['lineup', index, 'artistName'], message: 'Artista già in scaletta' })
      }
      seen.add(name)
      if (entry.performanceStart !== '' && entry.performanceEnd !== '' && new Date(entry.performanceEnd) < new Date(entry.performanceStart)) {
        context.addIssue({ code: 'custom', path: ['lineup', index, 'performanceEnd'], message: "La fine non può precedere l'inizio" })
      }
    })
  })
}

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  venueName: '',
  address: '',
  city: '',
  province: '',
  latitude: '',
  longitude: '',
  maxParticipants: '',
  lineup: [],
  markers: [],
}

function localOrEmpty(iso: string | null): string {
  if (iso === null) {
    return ''
  }
  return toLocalInputValue(iso)
}

function numberOrEmpty(value: number | null): string {
  if (value === null) {
    return ''
  }
  return String(value)
}

/** Evento salvato -> valori iniziali del form di modifica. */
export function toFormValues(event: EventResponse): EventFormValues {
  return {
    title: event.title,
    description: event.description ?? '',
    startsAt: toLocalInputValue(event.startsAt),
    endsAt: localOrEmpty(event.endsAt),
    venueName: event.venueName ?? '',
    address: event.address,
    city: event.city,
    province: event.province ?? '',
    latitude: String(event.latitude),
    longitude: String(event.longitude),
    maxParticipants: numberOrEmpty(event.maxParticipants),
    lineup: event.lineup.map((entry) => ({
      artistName: entry.artistName,
      performanceStart: localOrEmpty(entry.performanceStart),
      performanceEnd: localOrEmpty(entry.performanceEnd),
    })),
    markers: event.markers.map((marker) => ({
      kind: marker.kind,
      label: marker.label ?? '',
      latitude: String(marker.latitude),
      longitude: String(marker.longitude),
    })),
  }
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }
  return trimmed
}

function isoOrNull(value: string): string | null {
  if (value === '') {
    return null
  }
  return fromLocalInputValue(value)
}

/**
 * Valori del form (gia' validati) -> body di POST/PUT /api/events.
 * saved = evento in modifica: se l'inizio non e' stato toccato si rimanda l'istante salvato tale e
 * quale (l'input perde i secondi, e un evento gia' iniziato risulterebbe "spostato nel passato").
 */
export function toEventRequest(values: EventFormValues, saved?: Pick<EventResponse, 'startsAt'>): EventRequest {
  let startsAt = fromLocalInputValue(values.startsAt)
  if (saved !== undefined && values.startsAt === toLocalInputValue(saved.startsAt)) {
    startsAt = saved.startsAt
  }
  let maxParticipants: number | null = null
  if (values.maxParticipants.trim() !== '') {
    maxParticipants = Number.parseInt(values.maxParticipants, 10)
  }
  const lineup: LineupEntryRequest[] = values.lineup.map((entry) => ({
    artistName: entry.artistName.trim(),
    performanceStart: isoOrNull(entry.performanceStart),
    performanceEnd: isoOrNull(entry.performanceEnd),
  }))
  const markers: MarkerRequest[] = values.markers.map((marker) => ({
    kind: marker.kind,
    label: textOrNull(marker.label),
    latitude: parseCoordinate(marker.latitude),
    longitude: parseCoordinate(marker.longitude),
  }))
  return {
    title: values.title.trim(),
    description: textOrNull(values.description),
    startsAt,
    endsAt: isoOrNull(values.endsAt),
    venueName: textOrNull(values.venueName),
    address: values.address.trim(),
    city: values.city.trim(),
    province: textOrNull(values.province.toUpperCase()),
    latitude: parseCoordinate(values.latitude),
    longitude: parseCoordinate(values.longitude),
    maxParticipants,
    lineup,
    markers,
  }
}
