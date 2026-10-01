import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { FormError } from '@/components/form/FormError'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCountdown } from '@/hooks/useCountdown'
import { refreshCsrf } from '@/lib/csrf'
import { ApiError, errorMessage } from '@/lib/errors'
import { applyFieldErrors } from '@/lib/form-errors'
import { formatWait } from '@/lib/wait'
import { deleteAccount } from '../api'
import { deleteAccountSchema, type DeleteAccountValues } from '../schemas'

const DEFAULT_WAIT_SECONDS = 60
// Messaggio di ProfileService.checkPassword (stesso controllo del cambio password).
const WRONG_PASSWORD = 'Password attuale non corretta'

/**
 * Eliminazione dell'account (D15: anonimizzazione, non si annulla). Si conferma con la password,
 * come chiede il backend: una sessione lasciata aperta non basta a cancellare l'account.
 */
export function DeleteAccountDialog() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const wait = useCountdown()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string>()
  const form = useForm<DeleteAccountValues>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { password: '' } })
  const { errors, isSubmitting } = form.formState

  function handleOpenChange(next: boolean) {
    // Mentre la richiesta e' in corso il dialog non si chiude; chiudendolo la password non resta nel campo.
    if (isSubmitting) {
      return
    }
    setOpen(next)
    if (!next) {
      form.reset()
      setServerError(undefined)
    }
  }

  async function onSubmit(values: DeleteAccountValues) {
    setServerError(undefined)
    try {
      await deleteAccount({ password: values.password })
    } catch (error: unknown) {
      handleError(error)
      return
    }
    // Il backend ha gia' chiuso tutte le sessioni: prima si lascia la pagina protetta (altrimenti la
    // guardia porterebbe al login), poi si azzera l'utente nel browser senza chiamare POST /logout.
    await navigate('/', { replace: true })
    clearSession()
    toast.success('Il tuo account è stato eliminato.')
    await refreshCsrf().catch(() => undefined)
  }

  function handleError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setServerError(errorMessage(error))
      return
    }
    if (error.status === 429) {
      const seconds = error.retryAfterSeconds ?? DEFAULT_WAIT_SECONDS
      wait.start(seconds)
      return
    }
    if (applyFieldErrors(form, error)) {
      return
    }
    if (error.status === 400 && error.message === WRONG_PASSWORD) {
      form.setError('password', { type: 'server', message: 'La password non è corretta' })
      form.setFocus('password')
      return
    }
    // Es. 400 "Un SUPERADMIN non puo' cancellare il proprio account".
    setServerError(error.message)
  }

  let confirmLabel = 'Elimina definitivamente'
  if (isSubmitting) {
    confirmLabel = 'Eliminazione…'
  } else if (wait.seconds > 0) {
    confirmLabel = `Riprova tra ${formatWait(wait.seconds)}`
  }
  // L'avviso del 429 segue il conto alla rovescia: a tempo scaduto sparisce da solo.
  let formError = serverError ?? errors.root?.server?.message
  if (wait.seconds > 0) {
    formError = `Troppi tentativi. Riprova tra ${formatWait(wait.seconds)}.`
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          Elimina account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Eliminare l'account?</DialogTitle>
            <DialogDescription>
              L'operazione non si può annullare: i tuoi dati personali vengono cancellati e non potrai più accedere. Gli eventi che hai
              creato e i tuoi messaggi restano visibili a nome «Utente eliminato».
            </DialogDescription>
          </DialogHeader>
          <FormError message={formError} />
          <FormField id="delete-account-password" label="Conferma con la tua password" error={errors.password?.message}>
            {(control) => <Input {...control} {...form.register('password')} type="password" autoComplete="current-password" />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => handleOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || wait.seconds > 0}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
