import { CheckIcon, PaperPlaneTiltIcon, TicketIcon, UserPlusIcon } from '@phosphor-icons/react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { NativeSelect } from '@/features/admin/components/NativeSelect'
import { useMyTickets } from '@/features/tickets/hooks/useTickets'
import { ApiError, errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSendFriendRequest } from '../hooks/useFriends'

// I ticket dell'utente bastano in una pagina: il backend limita comunque la dimensione.
const MY_EVENTS_SIZE = 50

interface RequestFriendshipProps {
  user: { id: string; firstName: string; lastName: string }
  /** Allineamento del bottone e del pannello: a destra nelle liste, centrato nel profilo. */
  align?: 'end' | 'center'
}

/** Esito al posto del bottone: richiesta partita, oppure lo stato dell'amicizia (409 del backend). */
function Outcome({ text, align }: { text: string; align: 'end' | 'center' }) {
  return (
    <p role="status" className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', align === 'center' && 'justify-center')}>
      <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      {text}
    </p>
  )
}

/**
 * "Aggiungi agli amici" da ricerca e profilo. Il backend accetta la richiesta solo tra partecipanti
 * dello stesso evento (D12): si sceglie l'evento in comune tra i propri ticket, senza dover tornare
 * alla lista dei partecipanti.
 */
export function RequestFriendship({ user, align = 'end' }: RequestFriendshipProps) {
  const [open, setOpen] = useState(false)
  const request = useSendFriendRequest()
  const tickets = useMyTickets(0, MY_EVENTS_SIZE, open)
  const selectId = useId()
  const name = user.firstName

  if (request.isSuccess) {
    return <Outcome text={`Richiesta inviata a ${name}`} align={align} />
  }
  // 409: "Siete gia' amici", "Richiesta gia' inviata"...: e' lo stato dell'amicizia, non un errore.
  if (request.error instanceof ApiError && request.error.status === 409) {
    return <Outcome text={request.error.message} align={align} />
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
        <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
        Aggiungi agli amici
      </Button>
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const eventId = String(new FormData(event.currentTarget).get('eventId') ?? '')
    if (eventId !== '') {
      request.mutate({ addresseeId: user.id, eventId })
    }
  }

  let body
  if (tickets.isPending) {
    body = <Skeleton className="h-9 w-full" aria-label="Caricamento dei tuoi eventi…" />
  } else if (tickets.isError) {
    body = (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage(tickets.error)}
      </p>
    )
  } else if (tickets.data.content.length === 0) {
    body = (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          Per aggiungere {name} dovete partecipare allo stesso evento, e tu non sei ancora iscritto a nessuno.
        </p>
        <Button asChild size="sm" className="w-fit">
          <Link to="/">
            <TicketIcon data-icon="inline-start" aria-hidden="true" />
            Trova un evento
          </Link>
        </Button>
      </div>
    )
  } else {
    // Un 403 vuol dire che l'altra persona non e' iscritta all'evento scelto: si spiega con parole sue.
    let error = null
    if (request.isError) {
      let text = errorMessage(request.error)
      if (request.error instanceof ApiError && request.error.status === 403) {
        text = `${name} non risulta tra i partecipanti di questo evento. Scegline un altro a cui andate insieme.`
      }
      error = (
        <p role="alert" className="text-sm font-medium text-destructive">
          {text}
        </p>
      )
    }
    let submitLabel = `Invia richiesta a ${name}`
    if (request.isPending) {
      submitLabel = 'Invio…'
    }
    body = (
      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={selectId}>A quale evento andate insieme?</Label>
          <NativeSelect id={selectId} name="eventId" required className="h-9">
            {tickets.data.content.map((ticket) => (
              <option key={ticket.id} value={ticket.event.id}>
                {ticket.event.title} · {formatDate(ticket.event.startsAt)}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">Le amicizie nascono tra chi partecipa allo stesso evento.</p>
        </div>
        {error}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={request.isPending}>
            <PaperPlaneTiltIcon data-icon="inline-start" aria-hidden="true" />
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Annulla
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className={cn('grid w-full gap-3 rounded-lg border bg-card p-4 text-left', align === 'center' && 'max-w-md')}>
      {body}
    </div>
  )
}
