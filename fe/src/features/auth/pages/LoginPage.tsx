import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { FormField } from '@/components/form/FormField'
import { Input } from '@/components/ui/input'
import { useCountdown } from '@/hooks/useCountdown'
import { ApiError, errorMessage } from '@/lib/errors'
import { formatWait } from '@/lib/wait'
import { AuthShell } from '../components/AuthShell'
import { FormError } from '@/components/form/FormError'
import { SubmitButton } from '@/components/form/SubmitButton'
import { emailFromState, safeReturnPath } from '@/lib/navigation'
import { loginSchema, type LoginValues } from '../schemas'

// Senza Retry-After (es. header non leggibile) si aspetta un minuto prima di riprovare.
const DEFAULT_WAIT_SECONDS = 60

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const wait = useCountdown()
  const [serverError, setServerError] = useState<string>()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: emailFromState(location.state), password: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: LoginValues) {
    setServerError(undefined)
    try {
      const user = await login({ email: values.email, password: values.password })
      toast.success(`Bentornato, ${user.firstName}`)
      navigate(safeReturnPath(location.state), { replace: true })
    } catch (error: unknown) {
      handleError(error, values.email)
    }
  }

  function handleError(error: unknown, email: string) {
    if (!(error instanceof ApiError)) {
      setServerError(errorMessage(error))
      return
    }
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      toast.info('Conferma prima la tua email con il codice che ti abbiamo inviato.')
      navigate(`/verify?email=${encodeURIComponent(email)}`)
      return
    }
    if (error.code === 'ACCOUNT_DEACTIVATED') {
      setServerError('Il tuo account è stato disattivato da un moderatore.')
      return
    }
    if (error.status === 401) {
      // Stesso messaggio per email inesistente e password sbagliata: non si rivela chi e' registrato.
      setServerError('Email o password non corretti.')
      form.setFocus('password')
      return
    }
    if (error.status === 429) {
      const seconds = error.retryAfterSeconds ?? DEFAULT_WAIT_SECONDS
      wait.start(seconds)
      setServerError(`Troppi tentativi. Riprova tra ${formatWait(seconds)}.`)
      return
    }
    setServerError(error.message)
  }

  let submitLabel = 'Accedi'
  if (wait.seconds > 0) {
    submitLabel = `Riprova tra ${formatWait(wait.seconds)}`
  }

  return (
    <AuthShell
      title="Accedi"
      description="Entra per iscriverti agli eventi, scrivere agli amici e gestire i tuoi eventi."
      footer={
        <>
          Non hai un account?{' '}
          <Link to="/register" className="font-medium text-foreground underline underline-offset-4">
            Registrati
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormError message={serverError} />
        <FormField id="login-email" label="Email" error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="nome@esempio.it…"
            />
          )}
        </FormField>
        <FormField id="login-password" label="Password" error={errors.password?.message}>
          {(control) => <Input {...control} {...form.register('password')} type="password" autoComplete="current-password" />}
        </FormField>
        <SubmitButton isPending={isSubmitting} pendingLabel="Accesso in corso…" disabled={wait.seconds > 0}>
          {submitLabel}
        </SubmitButton>
      </form>
    </AuthShell>
  )
}
