import { TrashIcon } from '@phosphor-icons/react'
import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { FormField } from '@/components/form/FormField'
import { MARKER_LABELS } from '@/components/map/pin-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MARKER_KINDS, type EventFormValues } from '../../schemas'
import { SELECT_CLASS } from './FormSection'

interface MarkerRowsProps {
  form: UseFormReturn<EventFormValues>
  fields: ReadonlyArray<FieldArrayWithId<EventFormValues, 'markers'>>
  onRemove: (index: number) => void
}

/**
 * Elenco testuale dei marker: tipo, etichetta e coordinate si modificano anche senza mappa
 * (tastiera, screen reader), e da qui si tolgono.
 */
export function MarkerRows({ form, fields, onRemove }: MarkerRowsProps) {
  const errors = form.formState.errors.markers
  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun marker: ingressi e uscite compariranno qui.</p>
  }
  return (
    <ul className="grid gap-3" aria-label="Marker dell'evento">
      {fields.map((field, index) => {
        const position = index + 1
        return (
          <li key={field.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_8rem_8rem_auto] lg:items-start">
            <FormField id={`event-marker-${index}-kind`} label={`Tipo del marker ${position}`} error={errors?.[index]?.kind?.message}>
              {(control) => (
                <select {...control} {...form.register(`markers.${index}.kind`)} className={SELECT_CLASS}>
                  {MARKER_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {MARKER_LABELS[kind]}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id={`event-marker-${index}-label`} label="Etichetta" error={errors?.[index]?.label?.message}>
              {(control) => <Input {...control} {...form.register(`markers.${index}.label`)} maxLength={100} autoComplete="off" placeholder="Ingresso principale…" />}
            </FormField>
            <FormField id={`event-marker-${index}-latitude`} label="Latitudine" error={errors?.[index]?.latitude?.message}>
              {(control) => <Input {...control} {...form.register(`markers.${index}.latitude`)} inputMode="decimal" autoComplete="off" className="font-mono tabular-nums" />}
            </FormField>
            <FormField id={`event-marker-${index}-longitude`} label="Longitudine" error={errors?.[index]?.longitude?.message}>
              {(control) => <Input {...control} {...form.register(`markers.${index}.longitude`)} inputMode="decimal" autoComplete="off" className="font-mono tabular-nums" />}
            </FormField>
            <Button type="button" variant="ghost" size="icon" className="pointer-coarse:size-11 lg:mt-6" onClick={() => onRemove(index)} aria-label={`Togli il marker ${position}`}>
              <TrashIcon aria-hidden="true" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
