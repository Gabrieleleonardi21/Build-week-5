import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FormError } from '@/components/form/FormError'
import { FormField } from '@/components/form/FormField'
import { SubmitButton } from '@/components/form/SubmitButton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { eventKeys } from '@/features/events/api'
import { ApiError, errorMessage } from '@/lib/errors'
import { applyFieldErrors } from '@/lib/form-errors'
import type { ArtistResponse } from '@/lib/types'
import { artistKeys, createArtist, updateArtist } from '../api'
import { artistSchema, toArtistRequest, toArtistValues, type ArtistValues } from '../schemas'

interface ArtistFormProps {
  /** Assente = artista nuovo. */
  artist: ArtistResponse | undefined
  onSaved: (saved: ArtistResponse) => void
}

function ArtistForm({ artist, onSaved }: ArtistFormProps) {
  const [serverError, setServerError] = useState<string>()
  const form = useForm<ArtistValues>({ resolver: zodResolver(artistSchema), defaultValues: toArtistValues(artist) })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: ArtistValues) {
    setServerError(undefined)
    try {
      const body = toArtistRequest(values)
      if (artist === undefined) {
        onSaved(await createArtist(body))
      } else {
        onSaved(await updateArtist(artist.id, body))
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        // Il nome e' unico senza distinguere maiuscole: l'errore va sul campo, non in un toast.
        form.setError('name', { message: 'Esiste già un artista con questo nome.' })
        form.setFocus('name')
        return
      }
      if (!applyFieldErrors(form, error)) {
        setServerError(errorMessage(error))
      }
    }
  }

  let submitLabel = 'Crea artista'
  if (artist !== undefined) {
    submitLabel = 'Salva modifiche'
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <FormError message={serverError ?? errors.root?.server?.message} />
      <FormField id="artist-name" label="Nome" error={errors.name?.message}>
        {(control) => <Input {...control} {...form.register('name')} autoComplete="off" maxLength={150} />}
      </FormField>
      <FormField id="artist-genre" label="Genere (facoltativo)" error={errors.genre?.message}>
        {(control) => <Input {...control} {...form.register('genre')} autoComplete="off" maxLength={100} placeholder="Jazz, indie rock…" />}
      </FormField>
      <FormField id="artist-bio" label="Biografia (facoltativa)" error={errors.bio?.message}>
        {(control) => <Textarea {...control} {...form.register('bio')} rows={5} maxLength={5000} />}
      </FormField>
      <FormField
        id="artist-image-url"
        label="Link a un'immagine (facoltativo)"
        description="Un indirizzo http:// o https:// di una foto già online."
        error={errors.imageUrl?.message}
      >
        {(control) => <Input {...control} {...form.register('imageUrl')} type="url" inputMode="url" autoComplete="off" spellCheck={false} maxLength={500} placeholder="https://…" />}
      </FormField>
      <SubmitButton isPending={isSubmitting} pendingLabel="Salvataggio…">
        {submitLabel}
      </SubmitButton>
    </form>
  )
}

interface ArtistFormDialogProps {
  /** Artista da modificare (MODERATOR); assente = "Nuovo artista" (qualsiasi utente loggato). */
  artist?: ArtistResponse
  /** Bottone che apre il dialog. */
  trigger: ReactNode
}

/** Creazione e modifica di un artista in un dialog: pochi campi, non serve una pagina a parte. */
export function ArtistFormDialog({ artist, trigger }: ArtistFormDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  function handleSaved(saved: ArtistResponse) {
    queryClient.setQueryData(artistKeys.detail(saved.id), saved)
    void queryClient.invalidateQueries({ queryKey: artistKeys.lists() })
    setOpen(false)
    if (artist === undefined) {
      toast.success(`${saved.name} aggiunto agli artisti`)
      navigate(`/artists/${saved.id}`)
      return
    }
    // Nome e genere compaiono anche nelle scalette degli eventi gia' in cache.
    void queryClient.invalidateQueries({ queryKey: eventKeys.all })
    toast.success('Artista aggiornato')
  }

  let title = 'Nuovo artista'
  let description = 'Potrai poi indicarlo nella scaletta dei tuoi eventi.'
  if (artist !== undefined) {
    title = `Modifica ${artist.name}`
    description = 'Le modifiche valgono per tutti gli eventi in cui compare.'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Il contenuto si smonta alla chiusura: a ogni apertura il form riparte dai valori salvati. */}
        <ArtistForm artist={artist} onSaved={handleSaved} />
      </DialogContent>
    </Dialog>
  )
}
