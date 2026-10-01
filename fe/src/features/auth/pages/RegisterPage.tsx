import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FormField } from '@/components/form/FormField'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, errorMessage } from '@/lib/errors'
import { applyFieldErrors } from '@/lib/form-errors'
import { register as registerRequest } from '../api'
import { AuthShell } from '../components/AuthShell'
import { FormError } from '@/components/form/FormError'
import { SubmitButton } from '@/components/form/SubmitButton'
import { registerSchema, type RegisterValues } from '../schemas'

/** Oggi nel formato di <input type="date">: la data di nascita non puo' essere nel futuro. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string>()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', birthDate: '', privacyAccepted: false },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: RegisterValues) {
    setServerError(undefined)
    try {
      await registerRequest({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        privacyAccepted: values.privacyAccepted,
      })
      toast.success('Ti abbiamo inviato un codice di 6 cifre per email.')
      navigate(`/verify?email=${encodeURIComponent(values.email)}`)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        form.setError('email', { message: 'Esiste già un account con questa email: prova ad accedere.' })
        form.setFocus('email')
        return
      }
      if (!applyFieldErrors(form, error)) {
        setServerError(errorMessage(error))
      }
    }
  }

  return (
    <AuthShell
      title="Crea un account"
      description="Ti serve per iscriverti agli eventi e crearne di tuoi. Ti mandiamo un codice per confermare l'email."
      footer={
        <>
          Hai già un account?{' '}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
            Accedi
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormError message={serverError ?? errors.root?.server?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="register-first-name" label="Nome" error={errors.firstName?.message}>
            {(control) => <Input {...control} {...form.register('firstName')} autoComplete="given-name" />}
          </FormField>
          <FormField id="register-last-name" label="Cognome" error={errors.lastName?.message}>
            {(control) => <Input {...control} {...form.register('lastName')} autoComplete="family-name" />}
          </FormField>
        </div>
        <FormField id="register-email" label="Email" error={errors.email?.message}>
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
        <FormField id="register-password" label="Password" description="Almeno 8 caratteri." error={errors.password?.message}>
          {(control) => <Input {...control} {...form.register('password')} type="password" autoComplete="new-password" />}
        </FormField>
        <FormField id="register-birth-date" label="Data di nascita" error={errors.birthDate?.message}>
          {(control) => <Input {...control} {...form.register('birthDate')} type="date" max={today()} autoComplete="bday" />}
        </FormField>
        <div className="grid gap-2">
          {/* Casella e testo nello stesso <label>: un'unica area cliccabile, niente zone morte. */}
          <Controller
            control={form.control}
            name="privacyAccepted"
            render={({ field }) => (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="register-privacy"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                  aria-invalid={errors.privacyAccepted !== undefined}
                  aria-describedby="register-privacy-error"
                  className="mt-0.5"
                />
                <Label htmlFor="register-privacy" className="leading-snug font-normal">
                  <span>
                    Ho letto e accetto l'
                    <Link to="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      informativa sulla privacy
                    </Link>
                  </span>
                </Label>
              </div>
            )}
          />
          {errors.privacyAccepted !== undefined && (
            <p id="register-privacy-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.privacyAccepted.message}
            </p>
          )}
        </div>
        <SubmitButton isPending={isSubmitting} pendingLabel="Creazione account…">
          Crea account
        </SubmitButton>
      </form>
    </AuthShell>
  )
}
