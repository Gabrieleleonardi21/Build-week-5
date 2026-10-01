import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError } from '@/components/form/FormError'
import { FormField } from '@/components/form/FormField'
import { SubmitButton } from '@/components/form/SubmitButton'
import { Input } from '@/components/ui/input'
import { useCountdown } from '@/hooks/useCountdown'
import { refreshCsrf } from '@/lib/csrf'
import { ApiError, errorMessage } from '@/lib/errors'
import { applyFieldErrors } from '@/lib/form-errors'
import { formatWait } from '@/lib/wait'
import { changePassword } from '../api'
import { passwordSchema, type PasswordValues } from '../schemas'

// Senza Retry-After (es. header non leggibile) si aspetta un minuto prima di riprovare.
const DEFAULT_WAIT_SECONDS = 60
// Messaggio di ProfileService.checkPassword: l'unico 400 che riguarda il campo "password attuale".
const WRONG_CURRENT_PASSWORD = 'Password attuale non corretta'
const EMPTY: PasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

interface ChangePasswordFormProps {
  /** Email dell'account: aiuta i gestori di password a salvare la nuova nel posto giusto. */
  email: string
}

/**
 * Cambio password (PUT /api/me/password). Serve la password attuale: una sessione lasciata
 * aperta da sola non basta. Il backend chiude le altre sessioni e lascia aperta questa.
 */
export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
  const wait = useCountdown()
  const [serverError, setServerError] = useState<string>()
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: EMPTY })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: PasswordValues) {
    setServerError(undefined)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      form.reset(EMPTY)
      toast.success('Password aggiornata. Le altre sessioni aperte sono state chiuse.')
      // Dopo il cambio password il token CSRF va riletto (lib/csrf.ts); se fallisce lo rilegge la prossima scrittura.
      await refreshCsrf().catch(() => undefined)
    } catch (error: unknown) {
      handleError(error)
    }
  }

  function handleError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setServerError(errorMessage(error))
      return
    }
    if (error.status === 429) {
      // 5 password attuali sbagliate: il backend blocca i tentativi per 15 minuti.
      const seconds = error.retryAfterSeconds ?? DEFAULT_WAIT_SECONDS
      wait.start(seconds)
      return
    }
    if (applyFieldErrors(form, error)) {
      return
    }
    if (error.status === 400 && error.message === WRONG_CURRENT_PASSWORD) {
      form.setError('currentPassword', { type: 'server', message: 'La password attuale non è corretta' })
      form.setFocus('currentPassword')
      return
    }
    if (error.status === 400) {
      // Gli altri 400 parlano della nuova password (uguale all'attuale, oltre i 72 byte).
      form.setError('newPassword', { type: 'server', message: error.message })
      form.setFocus('newPassword')
      return
    }
    setServerError(error.message)
  }

  let submitLabel = 'Cambia password'
  if (wait.seconds > 0) {
    submitLabel = `Riprova tra ${formatWait(wait.seconds)}`
  }
  // L'avviso del 429 segue il conto alla rovescia: a tempo scaduto sparisce da solo.
  let formError = serverError ?? errors.root?.server?.message
  if (wait.seconds > 0) {
    formError = `Troppi tentativi. Riprova tra ${formatWait(wait.seconds)}.`
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      {/*
        Email dell'account per i gestori di password: cosi' salvano la nuova password sull'account giusto.
        sr-only e non "hidden": alcuni gestori ignorano i campi nascosti. Fuori da tabulazione e screen reader.
      */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
      <FormError message={formError} />
      <FormField id="password-current" label="Password attuale" error={errors.currentPassword?.message}>
        {(control) => <Input {...control} {...form.register('currentPassword')} type="password" autoComplete="current-password" />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <FormField id="password-new" label="Nuova password" description="Almeno 8 caratteri." error={errors.newPassword?.message}>
          {(control) => <Input {...control} {...form.register('newPassword')} type="password" autoComplete="new-password" />}
        </FormField>
        <FormField id="password-confirm" label="Ripeti la nuova password" error={errors.confirmPassword?.message}>
          {(control) => <Input {...control} {...form.register('confirmPassword')} type="password" autoComplete="new-password" />}
        </FormField>
      </div>
      <SubmitButton isPending={isSubmitting} pendingLabel="Aggiornamento…" disabled={wait.seconds > 0} className="w-fit">
        {submitLabel}
      </SubmitButton>
    </form>
  )
}
