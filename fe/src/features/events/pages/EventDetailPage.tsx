import { ArrowLeftIcon, WarningIcon } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/components/auth/auth-context'
import { StatusBadge } from '@/components/data/StatusBadge'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ParticipantsList } from '@/features/tickets/components/ParticipantsList'
import { JoinButton } from '@/features/tickets/components/JoinButton'
import { ApiError } from '@/lib/errors'
import { hasRole } from '@/lib/roles'
import type { EventResponse, UserResponse } from '@/lib/types'
import { EventGallery } from '../components/EventGallery'
import { EventInfoPanel } from '../components/EventInfoPanel'
import { EventLocationMap } from '../components/EventLocationMap'
import { LineupList } from '../components/LineupList'
import { OwnerActions } from '../components/OwnerActions'
import { useEvent } from '../hooks/useEvent'

/** Proprietario o moderatore: solo per mostrare i comandi, i permessi veri li controlla il backend. */
function canManage(user: UserResponse | null, event: EventResponse): boolean {
  if (user === null) {
    return false
  }
  return user.id === event.owner.id || hasRole(user, 'MODERATOR')
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]" aria-label="Caricamento evento…">
      <div className="grid gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="aspect-[3/2] w-full rounded-2xl" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}

function EventNotFound() {
  return (
    <div className="grid justify-items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-balance">Evento non trovato</h1>
      <p className="text-muted-foreground">Potrebbe essere stato cancellato dall'organizzatore.</p>
      <Button asChild>
        <Link to="/">Vedi gli altri eventi</Link>
      </Button>
    </div>
  )
}

interface EventDetailProps {
  event: EventResponse
  user: UserResponse | null
}

function EventDetail({ event, user }: EventDetailProps) {
  const manage = canManage(user, event)
  // Iscrizione (T4) e, per proprietario/moderatori, gestione (T3): stessi posti per tutti.
  const actions = (
    <div className="grid gap-3">
      <JoinButton event={event} />
      {manage && <OwnerActions event={event} />}
    </div>
  )

  return (
    <article className="grid gap-10">
      {/* React 19 porta <title> nell'<head>: la scheda del browser mostra il nome dell'evento. */}
      <title>{`${event.title} · Eventi`}</title>
      {event.status === 'CANCELLED' && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <WarningIcon className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <p>
            <span className="font-medium">Evento annullato.</span> Gli iscritti sono stati avvisati con una notifica.
          </p>
        </div>
      )}
      {/*
        Su mobile l'ordine e' quello del codice: titolo, foto, riquadro (data, luogo, iscrizione), descrizione,
        scaletta. Da lg il riquadro va nella colonna destra e resta visibile scorrendo (sticky).
      */}
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <header className="grid min-w-0 gap-3 lg:col-start-1">
          <StatusBadge status={event.status} endsAt={event.endsAt ?? event.startsAt} />
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{event.title}</h1>
        </header>
        <div className="min-w-0 lg:col-start-1">
          <EventGallery title={event.title} images={event.images} />
        </div>
        <div className="lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-stretch">
          <EventInfoPanel event={event} actions={actions} />
        </div>
        <div className="grid min-w-0 gap-8 lg:col-start-1">
          {event.description !== null && (
            <section aria-labelledby="about-title" className="grid gap-3">
              <h2 id="about-title" className="text-xl font-semibold">
                L'evento
              </h2>
              {/* Testo dell'organizzatore: mostrato come testo (a capo compresi), mai come HTML. */}
              <p className="max-w-prose whitespace-pre-line text-muted-foreground">{event.description}</p>
            </section>
          )}
          {event.lineup.length > 0 && (
            <section aria-labelledby="lineup-title" className="grid gap-3">
              <h2 id="lineup-title" className="text-xl font-semibold">
                Scaletta
              </h2>
              <LineupList lineup={event.lineup} />
            </section>
          )}
        </div>
      </div>
      <section aria-labelledby="map-title" className="grid gap-3">
        <h2 id="map-title" className="text-xl font-semibold">
          Come arrivare
        </h2>
        <EventLocationMap event={event} />
      </section>
      {user !== null && (
        <section aria-labelledby="participants-title" className="grid gap-3">
          <h2 id="participants-title" className="text-xl font-semibold">
            Partecipanti
          </h2>
          <ParticipantsList eventId={event.id} />
        </section>
      )}
    </article>
  )
}

/** Dettaglio evento: pagina di arrivo di card, email dei ticket e notifiche (/events/:id). */
export function EventDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const event = useEvent(id)

  let content = (
    <QueryState query={event} loading={<DetailSkeleton />}>
      {(data) => <EventDetail event={data} user={user} />}
    </QueryState>
  )
  if (event.error instanceof ApiError && event.error.status === 404) {
    content = <EventNotFound />
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 pb-16">
      <Button asChild variant="ghost" className="w-fit">
        <Link to="/">
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Tutti gli eventi
        </Link>
      </Button>
      {content}
    </div>
  )
}
