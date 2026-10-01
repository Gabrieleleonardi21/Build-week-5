import { CheckCircleIcon, SpinnerIcon, TicketIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/components/auth/auth-context'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'
import type { EventResponse, TicketResponse } from '@/lib/types'
import { useJoinEvent, useLeaveEvent, useMyTicket } from '../hooks/useTickets'

export interface JoinButtonProps {
  event: EventResponse
}

/** Riga di spiegazione al posto del bottone (organizzatore, iscrizioni chiuse). */
function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

interface EnrolledProps {
  event: EventResponse
  ticket: TicketResponse
  /** false quando l'evento e' iniziato: il backend rifiuterebbe l'annullamento (400). */
  canLeave: boolean
}

function Enrolled({ event, ticket, canLeave }: EnrolledProps) {
  const leave = useLeaveEvent(event.id)
  return (
    <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <CheckCircleIcon className="shrink-0 text-primary" weight="fill" aria-hidden="true" />
        Sei iscritto
      </p>
      <p className="text-sm text-muted-foreground">
        Codice del ticket: <span className="font-mono font-medium text-foreground">{ticket.code}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Mostra il codice all'ingresso. Intanto puoi{' '}
        <a href="#partecipanti" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
          vedere chi partecipa
        </a>{' '}
        e aggiungerli agli amici.
      </p>
      {canLeave && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" className="w-full">
              Annulla iscrizione
            </Button>
          }
          title="Annullare l'iscrizione?"
          description={`Il tuo posto per "${event.title}" torna disponibile. Potrai iscriverti di nuovo finché ci sono posti.`}
          confirmLabel="Annulla iscrizione"
          destructive
          onConfirm={() => leave.mutateAsync()}
        />
      )}
    </div>
  )
}

/**
 * TRACCIA T4. Iscrizione / annullamento per l'utente loggato.
 * Le regole vere sono nel backend (TicketService): qui si evitano solo i tentativi inutili,
 * scrivendo il motivo quando non ci si puo' iscrivere (annullato, iniziato, al completo, organizzatore).
 */
export function JoinButton({ event }: JoinButtonProps) {
  const { user, isLoading } = useAuth()
  // L'ora si legge una volta al montaggio: il render resta puro (come in StatusBadge).
  const [now] = useState(Date.now)
  const isOwner = user !== null && user.id === event.owner.id
  const isCancelled = event.status === 'CANCELLED'
  // Anonimi, organizzatore ed evento annullato: il ticket non serve, la chiamata non parte.
  const ticket = useMyTicket(event.id, user !== null && !isOwner && !isCancelled)
  const join = useJoinEvent(event.id)

  if (isLoading) {
    return <Skeleton className="h-9 w-full" />
  }
  if (isCancelled) {
    return <Note>Evento annullato: le iscrizioni sono chiuse.</Note>
  }
  const hasStarted = new Date(event.startsAt).getTime() <= now
  if (user === null) {
    if (hasStarted) {
      return <Note>Iscrizioni chiuse: l'evento è già iniziato.</Note>
    }
    return (
      <Button asChild size="lg" className="w-full">
        {/* state.from: dopo il login si torna a questo evento (RequireGuest + safeReturnPath). */}
        <Link to="/login" state={{ from: `/events/${event.id}` }}>
          Accedi per iscriverti
        </Link>
      </Button>
    )
  }
  if (isOwner) {
    return <Note>Sei l'organizzatore di questo evento.</Note>
  }
  if (ticket.isPending) {
    return <Skeleton className="h-9 w-full" aria-label="Caricamento iscrizione…" />
  }
  if (ticket.isError) {
    return (
      <div role="alert" className="grid gap-2 text-sm">
        <p className="text-muted-foreground">{errorMessage(ticket.error)}</p>
        <Button variant="outline" onClick={() => void ticket.refetch()}>
          Riprova
        </Button>
      </div>
    )
  }
  if (ticket.data !== null && ticket.data !== undefined) {
    return <Enrolled event={event} ticket={ticket.data} canLeave={!hasStarted} />
  }
  if (hasStarted) {
    return <Note>Iscrizioni chiuse: l'evento è già iniziato.</Note>
  }
  if (event.maxParticipants !== null && event.participants >= event.maxParticipants) {
    return (
      <div className="grid gap-2">
        <Button size="lg" className="w-full" disabled>
          Posti esauriti
        </Button>
        <Note>Se qualcuno annulla l'iscrizione il posto torna disponibile.</Note>
      </div>
    )
  }

  let icon = <TicketIcon data-icon="inline-start" aria-hidden="true" />
  let label = 'Partecipa'
  if (join.isPending) {
    icon = <SpinnerIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />
    label = 'Iscrizione in corso…'
  }
  return (
    <div className="grid gap-2">
      <Button size="lg" className="w-full" disabled={join.isPending} onClick={() => join.mutate()}>
        {icon}
        {label}
      </Button>
      {/* 409 "gia' iscritto" / "al completo": il messaggio del backend e' gia' in italiano. */}
      {join.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage(join.error)}
        </p>
      )}
      <Note>Gratis. Ricevi subito il ticket con il codice d'ingresso, anche per email.</Note>
    </div>
  )
}
