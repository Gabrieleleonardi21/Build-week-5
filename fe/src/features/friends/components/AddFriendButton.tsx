import { CheckIcon, UserPlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ApiError, errorMessage } from '@/lib/errors'
import { useSendFriendRequest } from '../hooks/useFriends'

interface AddFriendButtonProps {
  /** Utente a cui chiedere l'amicizia. */
  addresseeId: string
  /** Evento a cui partecipate entrambi: il backend lo verifica (D12). */
  eventId: string
  /** Nome per l'etichetta accessibile ("Chiedi l'amicizia a Sara"). */
  name: string
}

/** Richiesta di amicizia dalla lista partecipanti; dopo l'invio (o un 409) al posto del bottone resta l'esito. */
export function AddFriendButton({ addresseeId, eventId, name }: AddFriendButtonProps) {
  const request = useSendFriendRequest()

  if (request.isSuccess) {
    return (
      <p role="status" className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
        <CheckIcon className="size-4" aria-hidden="true" />
        Richiesta inviata
      </p>
    )
  }
  // 409: "Siete gia' amici", "Richiesta gia' inviata" o "Ti ha gia' inviato una richiesta":
  // non e' un errore da riprovare, e' lo stato dell'amicizia (messaggio del backend).
  if (request.error instanceof ApiError && request.error.status === 409) {
    return (
      <p role="status" className="shrink-0 text-right text-sm text-muted-foreground">
        {request.error.message}
      </p>
    )
  }

  return (
    <div className="grid shrink-0 justify-items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={request.isPending}
        aria-label={`Chiedi l'amicizia a ${name}`}
        onClick={() => request.mutate({ addresseeId, eventId })}
      >
        <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
        Aggiungi
      </Button>
      {request.isError && (
        <p role="alert" className="max-w-40 text-right text-xs font-medium text-destructive">
          {errorMessage(request.error)}
        </p>
      )}
    </div>
  )
}
