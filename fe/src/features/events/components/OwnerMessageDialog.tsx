import { zodResolver } from '@hookform/resolvers/zod'
import { MegaphoneIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormError } from '@/components/form/FormError'
import { FormField } from '@/components/form/FormField'
import { SubmitButton } from '@/components/form/SubmitButton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import { applyFieldErrors } from '@/lib/form-errors'
import { sendOwnerMessage } from '../manage-api'

// Stessi limiti del backend (OwnerMessageRequest).
const messageSchema = z.object({
  title: z.string().trim().min(1, 'Inserisci un titolo').max(150, 'Massimo 150 caratteri'),
  body: z.string().trim().min(1, 'Scrivi il messaggio').max(5000, 'Massimo 5000 caratteri'),
})
type MessageValues = z.infer<typeof messageSchema>

interface MessageFormProps {
  eventId: string
  onSent: () => void
}

function MessageForm({ eventId, onSent }: MessageFormProps) {
  const [serverError, setServerError] = useState<string>()
  const form = useForm<MessageValues>({ resolver: zodResolver(messageSchema), defaultValues: { title: '', body: '' } })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: MessageValues) {
    setServerError(undefined)
    try {
      await sendOwnerMessage(eventId, values)
      onSent()
    } catch (error: unknown) {
      if (!applyFieldErrors(form, error)) {
        setServerError(errorMessage(error))
      }
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <FormError message={serverError ?? errors.root?.server?.message} />
      <FormField id="owner-message-title" label="Titolo" error={errors.title?.message}>
        {(control) => <Input {...control} {...form.register('title')} autoComplete="off" maxLength={150} placeholder="Cambio di orario…" />}
      </FormField>
      <FormField id="owner-message-body" label="Messaggio" error={errors.body?.message}>
        {(control) => <Textarea {...control} {...form.register('body')} rows={5} maxLength={5000} />}
      </FormField>
      <SubmitButton isPending={isSubmitting} pendingLabel="Invio in corso…">
        Invia a tutti i partecipanti
      </SubmitButton>
    </form>
  )
}

interface OwnerMessageDialogProps {
  eventId: string
}

/** Avviso scritto a mano dal proprietario: arriva come notifica a chi ha un ticket valido. */
export function OwnerMessageDialog({ eventId }: OwnerMessageDialogProps) {
  const [open, setOpen] = useState(false)

  function handleSent() {
    setOpen(false)
    toast.success('Messaggio inviato ai partecipanti')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MegaphoneIcon data-icon="inline-start" aria-hidden="true" />
          Scrivi ai partecipanti
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Messaggio ai partecipanti</DialogTitle>
          <DialogDescription>Lo riceve come notifica chi è iscritto all'evento.</DialogDescription>
        </DialogHeader>
        {/* Il contenuto si smonta alla chiusura: riaprendo, il form e' di nuovo vuoto. */}
        <MessageForm eventId={eventId} onSent={handleSent} />
      </DialogContent>
    </Dialog>
  )
}
