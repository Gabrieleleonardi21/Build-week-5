import type { ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { FormField } from '@/components/form/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { EventFormValues } from '../../schemas'

interface BasicsSectionProps {
  form: UseFormReturn<EventFormValues>
  /** Spazio sotto la descrizione (in modifica: "Migliora con AI"). */
  descriptionAction?: ReactNode
}

/** Titolo, descrizione, date e capienza. */
export function BasicsSection({ form, descriptionAction }: BasicsSectionProps) {
  const { errors } = form.formState
  return (
    <div className="grid gap-4">
      <FormField id="event-title" label="Titolo" error={errors.title?.message}>
        {(control) => <Input {...control} {...form.register('title')} maxLength={150} autoComplete="off" placeholder="Jazz sotto le stelle…" />}
      </FormField>
      <div className="grid gap-2">
        <FormField
          id="event-description"
          label="Descrizione"
          description="Facoltativa. Cosa succede, cosa portare, per chi è."
          error={errors.description?.message}
        >
          {(control) => <Textarea {...control} {...form.register('description')} rows={6} maxLength={10_000} className="min-h-32" />}
        </FormField>
        {descriptionAction}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="event-starts-at" label="Inizio" error={errors.startsAt?.message}>
          {(control) => <Input {...control} {...form.register('startsAt')} type="datetime-local" />}
        </FormField>
        <FormField id="event-ends-at" label="Fine" description="Facoltativa." error={errors.endsAt?.message}>
          {(control) => <Input {...control} {...form.register('endsAt')} type="datetime-local" />}
        </FormField>
      </div>
      <div className="sm:max-w-xs">
        <FormField
          id="event-max-participants"
          label="Posti disponibili"
          description="Lascia vuoto per non mettere un limite."
          error={errors.maxParticipants?.message}
        >
          {(control) => <Input {...control} {...form.register('maxParticipants')} inputMode="numeric" autoComplete="off" placeholder="300…" />}
        </FormField>
      </div>
    </div>
  )
}
