import { ArrowLeftIcon, WarningIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/errors'
import { hasRole } from '@/lib/roles'
import type { EventRequest, EventResponse, UserResponse } from '@/lib/types'
import { AiDescription } from '../components/form/AiDescription'
import { EventForm } from '../components/form/EventForm'
import { FormSection } from '../components/form/FormSection'
import { PhotosSection } from '../components/form/PhotosSection'
import { PostersSection } from '../components/form/PostersSection'
import { useEvent } from '../hooks/useEvent'
import { useSaveEvent } from '../hooks/useEventMutations'
import { EMPTY_EVENT_FORM, toFormValues } from '../schemas'

// Traccia T3. Creazione e modifica condividono il form; foto, locandine e AI esistono solo in
// modifica, perche' hanno bisogno dell'id dell'evento: dopo "Crea" si arriva dritti li'.

interface PageShellProps {
  title: string
  description: string
  back: { to: string; label: string }
  children: ReactNode
}

function PageShell({ title, description, back, children }: PageShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 pb-16">
      <title>{`${title} · Tourevents`}</title>
      <Button asChild variant="ghost" className="w-fit">
        <Link to={back.to}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          {back.label}
        </Link>
      </Button>
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="max-w-prose text-muted-foreground text-pretty">{description}</p>
      </div>
      {children}
    </div>
  )
}

/** Nuovo evento (/events/new): salvato l'evento si passa alla modifica per aggiungere le foto. */
export function EventCreatePage() {
  const navigate = useNavigate()
  const save = useSaveEvent()

  async function handleSave(request: EventRequest): Promise<EventResponse> {
    const created = await save.mutateAsync(request)
    toast.success('Evento creato: ora aggiungi le foto.')
    navigate(`/events/${created.id}/edit`, { replace: true })
    return created
  }

  return (
    <PageShell
      title="Nuovo evento"
      description="Inserisci i dati principali. Foto, locandine e descrizione con l'AI si aggiungono subito dopo la creazione."
      back={{ to: '/me/events', label: 'I miei eventi' }}
    >
      <EventForm initialValues={EMPTY_EVENT_FORM} onSave={handleSave} submitLabel="Crea evento" pendingLabel="Creazione…" />
    </PageShell>
  )
}

function EditSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Caricamento evento…">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

interface NoticeProps {
  title: string
  description: string
  link: { to: string; label: string }
}

function Notice({ title, description, link }: NoticeProps) {
  return (
    <div className="grid justify-items-center gap-4 py-16 text-center">
      <h2 className="text-2xl font-semibold text-balance">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      <Button asChild>
        <Link to={link.to}>{link.label}</Link>
      </Button>
    </div>
  )
}

/** Proprietario o moderatore: solo per la UI, il backend risponde comunque 403 agli altri. */
function canEdit(user: UserResponse | null, event: EventResponse): boolean {
  if (user === null) {
    return false
  }
  return user.id === event.owner.id || hasRole(user, 'MODERATOR')
}

function EventEditor({ event }: { event: EventResponse }) {
  const save = useSaveEvent(event.id)
  const isCancelled = event.status === 'CANCELLED'

  async function handleSave(request: EventRequest): Promise<EventResponse> {
    const updated = await save.mutateAsync(request)
    toast.success('Evento aggiornato. I partecipanti ricevono una notifica.')
    return updated
  }

  return (
    <div className="grid gap-8">
      {isCancelled && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <WarningIcon className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <p>
            <span className="font-medium">Evento annullato.</span> Un evento annullato non si può più modificare: resta visibile
            agli iscritti così com'è.
          </p>
        </div>
      )}
      {/* I valori iniziali sono quelli del primo caricamento: un refetch (es. a foto caricata) non cancella cio' che si sta scrivendo. */}
      <EventForm
        initialValues={toFormValues(event)}
        saved={event}
        onSave={handleSave}
        submitLabel="Salva le modifiche"
        pendingLabel="Salvataggio…"
        disabled={isCancelled}
        descriptionAction={(access) => <AiDescription eventId={event.id} access={access} />}
      />
      {!isCancelled && (
        <>
          <FormSection id="photos-title" title="Foto" description="Si salvano da sole appena caricate, senza premere «Salva le modifiche».">
            <PhotosSection event={event} />
          </FormSection>
          <FormSection id="posters-title" title="Locandine" description="Una locandina per ogni artista in scaletta, mostrata accanto al suo nome.">
            <PostersSection event={event} />
          </FormSection>
        </>
      )}
    </div>
  )
}

/** Modifica evento (/events/:id/edit): dati, foto, locandine e descrizione con AI. */
export function EventEditPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const event = useEvent(id)

  let content = (
    <QueryState query={event} loading={<EditSkeleton />}>
      {(data) => {
        if (!canEdit(user, data)) {
          return (
            <Notice
              title="Non puoi modificare questo evento"
              description="Solo chi lo ha creato e i moderatori possono cambiarlo."
              link={{ to: `/events/${data.id}`, label: "Torna all'evento" }}
            />
          )
        }
        return <EventEditor event={data} />
      }}
    </QueryState>
  )
  if (event.error instanceof ApiError && event.error.status === 404) {
    content = (
      <Notice
        title="Evento non trovato"
        description="Potrebbe essere stato cancellato."
        link={{ to: '/me/events', label: 'Vai ai miei eventi' }}
      />
    )
  }

  let back = { to: '/me/events', label: 'I miei eventi' }
  if (event.data !== undefined) {
    back = { to: `/events/${event.data.id}`, label: "Torna all'evento" }
  }

  return (
    <PageShell title="Modifica evento" description="Le modifiche a data, luogo e scaletta vengono notificate a chi è iscritto." back={back}>
      {content}
    </PageShell>
  )
}
