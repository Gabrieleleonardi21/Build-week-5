import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { FormError } from '@/components/form/FormError'
import { SubmitButton } from '@/components/form/SubmitButton'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { errorMessage } from '@/lib/errors'
import { applyFieldErrors } from '@/lib/form-errors'
import { toLocalInputValue } from '@/lib/format'
import type { EventRequest, EventResponse } from '@/lib/types'
import { eventFormSchema, toEventRequest, toFormValues, type EventFormValues } from '../../schemas'
import { BasicsSection } from './BasicsSection'
import { FormSection } from './FormSection'
import { LineupSection } from './LineupSection'
import { PlaceSection } from './PlaceSection'

/** Quello che serve a "Migliora con AI": leggere la bozza e sostituirla con la proposta. */
export interface DescriptionAccess {
  getText: () => string
  setText: (text: string) => void
}

interface EventFormProps {
  initialValues: EventFormValues
  /** Evento in modifica; assente in creazione. */
  saved?: EventResponse
  /** Salva e restituisce l'evento del server; se lancia, l'errore finisce nel form. */
  onSave: (request: EventRequest) => Promise<EventResponse>
  submitLabel: string
  pendingLabel: string
  /** Evento annullato: si legge ma non si modifica. */
  disabled?: boolean
  descriptionAction?: (access: DescriptionAccess) => ReactNode
}

/** Form di creazione e modifica evento: stessi campi e stesse regole, cambia solo la chiamata. */
export function EventForm({ initialValues, saved, onSave, submitLabel, pendingLabel, disabled = false, descriptionAction }: EventFormProps) {
  const [serverError, setServerError] = useState<string>()
  // L'inizio gia' salvato si puo' lasciare anche se e' passato: lo schema deve conoscerlo.
  const savedStartsAt = saved?.startsAt
  const schema = useMemo(() => {
    if (savedStartsAt === undefined) {
      return eventFormSchema(null)
    }
    return eventFormSchema(toLocalInputValue(savedStartsAt))
  }, [savedStartsAt])
  const form = useForm<EventFormValues>({ resolver: zodResolver(schema), defaultValues: initialValues })
  const { errors, isSubmitting, isDirty } = form.formState

  // Chiudere o ricaricare la scheda con modifiche non salvate chiede conferma.
  useBeforeUnload(isDirty && !disabled)

  async function onSubmit(values: EventFormValues) {
    setServerError(undefined)
    try {
      const result = await onSave(toEventRequest(values, saved))
      // I valori salvati diventano il nuovo punto di partenza: il form non e' piu' "modificato".
      form.reset(toFormValues(result))
    } catch (error: unknown) {
      if (!applyFieldErrors(form, error)) {
        setServerError(errorMessage(error))
      }
    }
  }

  let action: ReactNode = null
  if (descriptionAction !== undefined) {
    action = descriptionAction({
      getText: () => form.getValues('description'),
      setText: (text) => form.setValue('description', text, { shouldDirty: true, shouldValidate: true }),
    })
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} aria-label="Dati dell'evento">
      {/* fieldset disabled spegne in un colpo tutti i campi e i bottoni (evento annullato). */}
      <fieldset disabled={disabled} className="grid min-w-0 gap-8">
        <BasicsSection form={form} descriptionAction={action} />
        <FormSection id="place-title" title="Luogo" description="Scrivi l'indirizzo e segna il punto esatto sulla mappa: è quello che vedranno i partecipanti.">
          <PlaceSection form={form} disabled={disabled} />
        </FormSection>
        <FormSection id="lineup-form-title" title="Scaletta" description="Chi suona, nell'ordine della serata. Gli artisti nuovi vengono creati con il nome che scrivi.">
          <LineupSection form={form} />
        </FormSection>
        <div className="grid gap-3 border-t pt-6">
          <FormError message={serverError ?? errors.root?.server?.message} />
          <SubmitButton isPending={isSubmitting} pendingLabel={pendingLabel} className="w-full sm:w-fit">
            {submitLabel}
          </SubmitButton>
        </div>
      </fieldset>
    </form>
  )
}
