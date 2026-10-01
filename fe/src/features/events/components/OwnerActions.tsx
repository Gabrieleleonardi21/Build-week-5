import { PencilSimpleIcon, ProhibitIcon, TrashIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { ticketKeys } from '@/features/tickets/api'
import { ApiError } from '@/lib/errors'
import type { EventResponse } from '@/lib/types'
import { eventKeys } from '../api'
import { cancelEvent, deleteEvent, myEventKeys } from '../manage-api'
import { OwnerMessageDialog } from './OwnerMessageDialog'

export interface OwnerActionsProps {
  event: EventResponse
}

/**
 * TRACCIA T3. Azioni di proprietario e moderatori (la pagina le mostra solo a loro; i permessi veri
 * li controlla il backend): modifica, messaggio ai partecipanti, annulla, elimina.
 */
export function OwnerActions({ event }: OwnerActionsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isCancelled = event.status === 'CANCELLED'
  // Ai partecipanti scrive solo il proprietario: per un moderatore il backend risponde 403.
  const isOwner = user !== null && user.id === event.owner.id

  function refreshLists() {
    void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: myEventKeys.all })
    // I ticket portano con se' stato e data dell'evento: anche "I miei ticket" va riletto.
    void queryClient.invalidateQueries({ queryKey: ticketKeys.all })
  }

  async function handleCancel() {
    await cancelEvent(event.id)
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
    refreshLists()
    toast.success('Evento annullato: gli iscritti sono stati avvisati')
  }

  async function handleDelete() {
    try {
      await deleteEvent(event.id)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        // Con iscritti l'evento non si cancella: si annulla, cosi' ricevono la notifica.
        throw new Error('L\'evento ha già degli iscritti e non si può eliminare: usa "Annulla evento", così vengono avvisati.', { cause: error })
      }
      throw error
    }
    // Prima si lascia la pagina: togliendo il dettaglio dalla cache mentre e' ancora aperta
    // partirebbe una rilettura che finisce in 404.
    await navigate('/me/events', { replace: true })
    queryClient.removeQueries({ queryKey: eventKeys.detail(event.id) })
    refreshLists()
    toast.success('Evento eliminato')
  }

  return (
    <section aria-labelledby="owner-actions-title" className="grid gap-2 border-t pt-4">
      <h2 id="owner-actions-title" className="text-sm font-medium text-muted-foreground">
        Gestione dell'evento
      </h2>
      {/* Un evento annullato non si puo' piu' modificare ne' annullare di nuovo (400 dal backend). */}
      {!isCancelled && (
        <Button asChild variant="outline">
          <Link to={`/events/${event.id}/edit`}>
            <PencilSimpleIcon data-icon="inline-start" aria-hidden="true" />
            Modifica
          </Link>
        </Button>
      )}
      {isOwner && <OwnerMessageDialog eventId={event.id} />}
      {!isCancelled && (
        <ConfirmDialog
          trigger={
            <Button variant="outline">
              <ProhibitIcon data-icon="inline-start" aria-hidden="true" />
              Annulla evento
            </Button>
          }
          title={`Annullare "${event.title}"?`}
          description="L'evento resta visibile come annullato e tutti gli iscritti ricevono una notifica. Non si può tornare indietro."
          confirmLabel="Annulla evento"
          destructive
          onConfirm={handleCancel}
        />
      )}
      <ConfirmDialog
        trigger={
          <Button variant="ghost" className="text-destructive hover:text-destructive">
            <TrashIcon data-icon="inline-start" aria-hidden="true" />
            Elimina
          </Button>
        }
        title={`Eliminare "${event.title}"?`}
        description="L'evento e le sue foto vengono cancellati per sempre. Si può fare solo se non ci sono iscritti."
        confirmLabel="Elimina evento"
        destructive
        onConfirm={handleDelete}
      />
    </section>
  )
}
