import { zodResolver } from '@hookform/resolvers/zod'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useCountdown } from '@/hooks/useCountdown'
import { ApiError, errorMessage } from '@/lib/errors'
import { formatWait } from '@/lib/wait'
import { resendCode, verifyEmail } from '../api'
import { AuthShell } from '../components/AuthShell'
import { FormError } from '../components/FormError'
import { SubmitButton } from '../components/SubmitButton'
import { verifySchema, type VerifyValues } from '../schemas'

// Attesa tra un reinvio e l'altro (il backend ne ammette 3 ogni 15 minuti).
const RESEND_COOLDOWN_SECONDS = 60
const CODE_SLOTS = [0, 1, 2, 3, 4, 5] as const

export function VerifyPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailFromLink = searchParams.get('email') ?? ''
  const cooldown = useCountdown()
  const [serverError, setServerError] = useState<string>()
  const [isResending, setIsResending] = useState(false)
  const form = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: emailFromLink, code: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: VerifyValues) {
    setServerError(undefined)
    try {
      await verifyEmail({ email: values.email, code: values.code })
      toast.success('Email confermata: ora puoi accedere.')
      navigate('/login', { state: { email: values.email } })
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 429) {
        setServerError(`Troppi tentativi. Riprova tra ${formatWait(error.retryAfterSeconds ?? 900)} o chiedi un nuovo codice.`)
        return
      }
      if (error instanceof ApiError && error.status === 400) {
        // Codice sbagliato o scaduto: il messaggio del backend va sotto il campo del codice.
        form.setError('code', { message: error.message })
        form.setValue('code', '')
        return
      }
      setServerError(errorMessage(error))
    }
  }

  async function handleResend() {
    const valid = await form.trigger('email')
    if (!valid) {
      return
    }
    setIsResending(true)
    try {
      await resendCode(form.getValues('email'))
      // Il backend risponde sempre 204, anche se l'email non esiste: non rivela chi e' registrato.
      toast.success('Se l’email è registrata, ti abbiamo inviato un nuovo codice.')
      cooldown.start(RESEND_COOLDOWN_SECONDS)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 429) {
        cooldown.start(error.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS)
      }
      toast.error(errorMessage(error))
    } finally {
      setIsResending(false)
    }
  }

  let resendLabel = 'Invia un nuovo codice'
  if (isResending) {
    resendLabel = 'Invio…'
  } else if (cooldown.seconds > 0) {
    resendLabel = `Nuovo codice tra ${formatWait(cooldown.seconds)}`
  }

  let description = 'Inserisci il codice di 6 cifre che ti abbiamo inviato per email.'
  if (emailFromLink !== '') {
    description = `Inserisci il codice di 6 cifre che abbiamo inviato a ${emailFromLink}.`
  }

  return (
    <AuthShell
      title="Conferma la tua email"
      description={description}
      footer={
        <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
          Torna all'accesso
        </Link>
      }
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormError message={serverError} />
        {/* Email modificabile solo se non arriva dal link (es. pagina aperta a mano). */}
        {emailFromLink === '' && (
          <FormField id="verify-email" label="Email" error={errors.email?.message}>
            {(control) => (
              <Input {...control} {...form.register('email')} type="email" autoComplete="email" spellCheck={false} />
            )}
          </FormField>
        )}
        <FormField id="verify-code" label="Codice di verifica" error={errors.code?.message}>
          {(control) => (
            <Controller
              control={form.control}
              name="code"
              render={({ field }) => (
                <InputOTP
                  {...control}
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                >
                  <InputOTPGroup>
                    {CODE_SLOTS.map((index) => (
                      <InputOTPSlot key={index} index={index} className="size-11 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              )}
            />
          )}
        </FormField>
        <SubmitButton isPending={isSubmitting} pendingLabel="Verifica…">
          Conferma email
        </SubmitButton>
        <Button type="button" variant="ghost" onClick={() => void handleResend()} disabled={isResending || cooldown.seconds > 0}>
          {resendLabel}
        </Button>
      </form>
    </AuthShell>
  )
}
