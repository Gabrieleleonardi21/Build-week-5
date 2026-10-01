import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAX_LINEUP, type EventFormValues } from '../../schemas'

interface LineupSectionProps {
  form: UseFormReturn<EventFormValues>
}

/** Scaletta: l'ordine delle righe e' l'ordine della serata (la prima apre). */
export function LineupSection({ form }: LineupSectionProps) {
  const lineup = useFieldArray({ control: form.control, name: 'lineup' })
  const errors = form.formState.errors.lineup
  const last = lineup.fields.length - 1

  return (
    <div className="grid gap-3">
      {lineup.fields.length > 0 && (
        <ol className="grid gap-3">
          {lineup.fields.map((field, index) => {
            const position = index + 1
            const name = form.watch(`lineup.${index}.artistName`)
            let who = `artista ${position}`
            if (name.trim() !== '') {
              who = name.trim()
            }
            return (
              <li key={field.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[2rem_1fr_auto] sm:items-start">
                <span className="grid size-8 place-items-center rounded-full bg-muted font-mono text-sm tabular-nums" aria-hidden="true">
                  {position}
                </span>
                <div className="grid gap-3 md:grid-cols-[1fr_13rem_13rem]">
                  <FormField id={`event-lineup-${index}-name`} label="Artista" error={errors?.[index]?.artistName?.message}>
                    {(control) => <Input {...control} {...form.register(`lineup.${index}.artistName`)} maxLength={150} autoComplete="off" />}
                  </FormField>
                  <FormField id={`event-lineup-${index}-start`} label="Dalle" error={errors?.[index]?.performanceStart?.message}>
                    {(control) => <Input {...control} {...form.register(`lineup.${index}.performanceStart`)} type="datetime-local" />}
                  </FormField>
                  <FormField id={`event-lineup-${index}-end`} label="Alle" error={errors?.[index]?.performanceEnd?.message}>
                    {(control) => <Input {...control} {...form.register(`lineup.${index}.performanceEnd`)} type="datetime-local" />}
                  </FormField>
                </div>
                <div className="flex gap-1 sm:pt-6">
                  <Button type="button" variant="ghost" size="icon" className="pointer-coarse:size-11" disabled={index === 0} onClick={() => lineup.move(index, index - 1)} aria-label={`Sposta su ${who}`}>
                    <ArrowUpIcon aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="pointer-coarse:size-11" disabled={index === last} onClick={() => lineup.move(index, index + 1)} aria-label={`Sposta giù ${who}`}>
                    <ArrowDownIcon aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="pointer-coarse:size-11" onClick={() => lineup.remove(index)} aria-label={`Togli ${who} dalla scaletta`}>
                    <TrashIcon aria-hidden="true" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {errors?.root?.message !== undefined && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {errors.root.message}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={lineup.fields.length >= MAX_LINEUP}
        onClick={() => lineup.append({ artistName: '', performanceStart: '', performanceEnd: '' })}
      >
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        Aggiungi artista
      </Button>
    </div>
  )
}
