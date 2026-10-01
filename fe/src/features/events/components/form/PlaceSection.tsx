import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { FormField } from '@/components/form/FormField'
import { MARKER_LABELS } from '@/components/map/pin-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MARKER_KINDS, MAX_MARKERS, parseCoordinate, type EventFormValues } from '../../schemas'
import { LocationPicker, type PickerMarker, type PickMode } from './LocationPicker'
import { MarkerRows } from './MarkerRows'

interface PlaceSectionProps {
  form: UseFormReturn<EventFormValues>
  disabled: boolean
}

const MODES: readonly PickMode[] = ['venue', ...MARKER_KINDS]

function modeLabel(mode: PickMode): string {
  if (mode === 'venue') {
    return "Luogo dell'evento"
  }
  return MARKER_LABELS[mode]
}

// 6 decimali = circa 10 cm: piu' che abbastanza per un ingresso, e niente numeri lunghissimi nei campi.
function round(value: number): string {
  return value.toFixed(6)
}

function toPosition(latitude: string, longitude: string): [number, number] | null {
  const lat = parseCoordinate(latitude)
  const lng = parseCoordinate(longitude)
  if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null
  }
  return [lat, lng]
}

/** Dove si svolge: indirizzo, punto sulla mappa e marker di ingressi e uscite (D08). */
export function PlaceSection({ form, disabled }: PlaceSectionProps) {
  const { errors } = form.formState
  const [mode, setMode] = useState<PickMode>('venue')
  const markers = useFieldArray({ control: form.control, name: 'markers' })
  const latitude = useWatch({ control: form.control, name: 'latitude' })
  const longitude = useWatch({ control: form.control, name: 'longitude' })
  const markerValues = useWatch({ control: form.control, name: 'markers' })

  const venue = toPosition(latitude, longitude)
  const pickerMarkers: PickerMarker[] = []
  for (const marker of markerValues) {
    const position = toPosition(marker.latitude, marker.longitude)
    if (position !== null) {
      pickerMarkers.push({ kind: marker.kind, label: marker.label, position })
    }
  }
  const isFull = markers.fields.length >= MAX_MARKERS

  function setVenue(lat: number, lng: number) {
    form.setValue('latitude', round(lat), { shouldDirty: true, shouldValidate: true })
    form.setValue('longitude', round(lng), { shouldDirty: true, shouldValidate: true })
  }

  function handlePick(lat: number, lng: number) {
    if (mode === 'venue') {
      setVenue(lat, lng)
      return
    }
    if (!isFull) {
      markers.append({ kind: mode, label: '', latitude: round(lat), longitude: round(lng) })
    }
  }

  // Senza mappa: il marker nasce sul luogo dell'evento e si sposta scrivendo le coordinate.
  function addMarkerByHand() {
    markers.append({ kind: 'ENTRANCE', label: '', latitude, longitude })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="event-venue-name" label="Nome del luogo" description="Facoltativo: locale, piazza, parco." error={errors.venueName?.message}>
          {(control) => <Input {...control} {...form.register('venueName')} maxLength={150} autoComplete="off" />}
        </FormField>
        <FormField id="event-address" label="Indirizzo" error={errors.address?.message}>
          {(control) => <Input {...control} {...form.register('address')} maxLength={255} autoComplete="street-address" />}
        </FormField>
        <FormField id="event-city" label="Città" error={errors.city?.message}>
          {(control) => <Input {...control} {...form.register('city')} maxLength={100} autoComplete="address-level2" />}
        </FormField>
        <FormField id="event-province" label="Provincia" description="Sigla di 2 lettere, es. MI." error={errors.province?.message}>
          {(control) => <Input {...control} {...form.register('province')} maxLength={2} autoComplete="address-level1" className="uppercase sm:max-w-24" />}
        </FormField>
      </div>

      <div className="grid gap-2">
        <p id="pick-mode-label" className="text-sm font-medium">
          Il clic sulla mappa mette
        </p>
        <div role="group" aria-labelledby="pick-mode-label" className="flex flex-wrap gap-2">
          {MODES.map((item) => {
            let variant: 'default' | 'outline' = 'outline'
            if (item === mode) {
              variant = 'default'
            }
            return (
              <Button
                key={item}
                type="button"
                variant={variant}
                size="sm"
                className="pointer-coarse:h-11"
                aria-pressed={item === mode}
                disabled={disabled || (item !== 'venue' && isFull)}
                onClick={() => setMode(item)}
              >
                {modeLabel(item)}
              </Button>
            )
          })}
        </div>
      </div>
      <LocationPicker venue={venue} markers={pickerMarkers} onPick={handlePick} onVenueMove={setVenue} disabled={disabled} />

      <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
        <FormField id="event-latitude" label="Latitudine" error={errors.latitude?.message}>
          {(control) => <Input {...control} {...form.register('latitude')} inputMode="decimal" autoComplete="off" className="font-mono tabular-nums" placeholder="45.464200…" />}
        </FormField>
        <FormField id="event-longitude" label="Longitudine" error={errors.longitude?.message}>
          {(control) => <Input {...control} {...form.register('longitude')} inputMode="decimal" autoComplete="off" className="font-mono tabular-nums" placeholder="9.190000…" />}
        </FormField>
      </div>

      <div className="grid gap-3">
        <h3 className="text-sm font-semibold">Ingressi e uscite</h3>
        <MarkerRows form={form} fields={markers.fields} onRemove={markers.remove} />
        {errors.markers?.root?.message !== undefined && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.markers.root.message}
          </p>
        )}
        <Button type="button" variant="outline" className="w-fit" disabled={isFull} onClick={addMarkerByHand}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Aggiungi marker
        </Button>
      </div>
    </div>
  )
}
