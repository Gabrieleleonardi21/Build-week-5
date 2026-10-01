import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError } from '@/components/form/FormError'
import { FormField } from '@/components/form/FormField'
import { SubmitButton } from '@/components/form/SubmitButton'
import { Input } from '@/components/ui/input'
import { authKeys } from '@/features/auth/api'
import { errorMessage } from '@/lib/errors'
import { applyFieldErrors } from '@/lib/form-errors'
import type { ProfileResponse } from '@/lib/types'
import { profileKeys, updateProfile } from '../api'
import { profileSchema, type ProfileValues } from '../schemas'

interface PersonalDataFormProps {
  profile: ProfileResponse
}

/** Dal profilo del backend ai valori del form: i campi assenti (null) diventano stringhe vuote. */
function toValues(profile: ProfileResponse): ProfileValues {
  const address = profile.address
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    birthDate: profile.birthDate,
    phone: profile.phone ?? '',
    address: {
      street: address?.street ?? '',
      city: address?.city ?? '',
      postalCode: address?.postalCode ?? '',
      province: address?.province ?? '',
      country: address?.country ?? '',
    },
  }
}

/** Oggi nel formato di <input type="date">: la data di nascita non puo' essere nel futuro. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Dati anagrafici (PUT /api/me). L'email si vede ma non si cambia: richiederebbe una nuova verifica. */
export function PersonalDataForm({ profile }: PersonalDataFormProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string>()
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: toValues(profile) })
  const { errors, isSubmitting, isDirty } = form.formState

  async function onSubmit(values: ProfileValues) {
    setServerError(undefined)
    try {
      const updated = await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        phone: values.phone,
        address: values.address,
      })
      queryClient.setQueryData(profileKeys.me, updated)
      // Nome e cognome compaiono anche nell'header (GET /api/auth/me).
      void queryClient.invalidateQueries({ queryKey: authKeys.me })
      // I valori salvati (ripuliti dal backend) diventano il nuovo punto di partenza del form.
      form.reset(toValues(updated))
      toast.success('Profilo aggiornato')
    } catch (error: unknown) {
      if (!applyFieldErrors(form, error)) {
        setServerError(errorMessage(error))
      }
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <FormError message={serverError ?? errors.root?.server?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="profile-first-name" label="Nome" error={errors.firstName?.message}>
          {(control) => <Input {...control} {...form.register('firstName')} autoComplete="given-name" />}
        </FormField>
        <FormField id="profile-last-name" label="Cognome" error={errors.lastName?.message}>
          {(control) => <Input {...control} {...form.register('lastName')} autoComplete="family-name" />}
        </FormField>
      </div>
      <FormField id="profile-email" label="Email" description="L'email non si può cambiare.">
        {(control) => <Input {...control} type="email" value={profile.email} readOnly autoComplete="email" className="bg-muted/50" />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="profile-birth-date" label="Data di nascita" error={errors.birthDate?.message}>
          {(control) => <Input {...control} {...form.register('birthDate')} type="date" max={today()} autoComplete="bday" />}
        </FormField>
        <FormField id="profile-phone" label="Telefono" description="Facoltativo." error={errors.phone?.message}>
          {(control) => (
            <Input {...control} {...form.register('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="+39 333 1234567…" />
          )}
        </FormField>
      </div>
      <fieldset className="grid gap-4 border-t pt-4">
        <legend className="float-left mb-4 w-full text-sm font-medium">Indirizzo (facoltativo)</legend>
        <FormField id="profile-street" label="Via e numero" error={errors.address?.street?.message}>
          {(control) => <Input {...control} {...form.register('address.street')} autoComplete="street-address" />}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField id="profile-city" label="Città" error={errors.address?.city?.message}>
            {(control) => <Input {...control} {...form.register('address.city')} autoComplete="address-level2" />}
          </FormField>
          <FormField id="profile-postal-code" label="CAP" error={errors.address?.postalCode?.message}>
            {(control) => <Input {...control} {...form.register('address.postalCode')} autoComplete="postal-code" maxLength={10} />}
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="profile-province" label="Provincia" description="Sigla di 2 lettere, es. MI." error={errors.address?.province?.message}>
            {(control) => (
              <Input {...control} {...form.register('address.province')} autoComplete="address-level1" maxLength={2} className="uppercase" />
            )}
          </FormField>
          <FormField id="profile-country" label="Paese" description="Codice di 2 lettere, es. IT." error={errors.address?.country?.message}>
            {(control) => <Input {...control} {...form.register('address.country')} autoComplete="country" maxLength={2} className="uppercase" />}
          </FormField>
        </div>
      </fieldset>
      {/* Disattivo finche' non cambia nulla: niente PUT inutili. */}
      <SubmitButton isPending={isSubmitting} pendingLabel="Salvataggio…" disabled={!isDirty} className="w-fit">
        Salva modifiche
      </SubmitButton>
    </form>
  )
}
