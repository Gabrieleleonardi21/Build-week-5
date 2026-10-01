import { ArrowClockwiseIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/format'
import type { ChatMessageResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Messaggio inviato ma non ancora confermato dal server (la conferma e' la copia che torna via STOMP). */
export interface PendingMessage {
  id: string
  content: string
  /** true se il server ha risposto con un errore: si puo' riprovare o scartare. */
  failed: boolean
}

interface MessageListProps {
  /** In ordine di lettura: dal piu' vecchio al piu' recente. */
  messages: readonly ChatMessageResponse[]
  pending: readonly PendingMessage[]
  meId: string
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  onRetry: (id: string) => void
  onDiscard: (id: string) => void
}

const BUBBLE = 'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap'
const MINE = 'rounded-br-md bg-primary text-primary-foreground'
const THEIRS = 'rounded-bl-md bg-muted'

/** Storico della conversazione con i separatori dei giorni; scorre da solo all'ultimo messaggio. */
export function MessageList({ messages, pending, meId, hasMore, isLoadingMore, onLoadMore, onRetry, onDiscard }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)
  // Cambia solo quando arriva un messaggio in fondo: caricando quelli precedenti non si salta giu'.
  const lastKey = pending.at(-1)?.id ?? messages.at(-1)?.id ?? ''

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [lastKey])

  let loadMoreLabel = 'Messaggi precedenti'
  if (isLoadingMore) {
    loadMoreLabel = 'Caricamento…'
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
      {hasMore && (
        <div className="flex justify-center pb-4">
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoadingMore}>
            {loadMoreLabel}
          </Button>
        </div>
      )}
      {messages.length === 0 && pending.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Nessun messaggio: scrivi tu il primo.</p>
      )}
      {/* role="log": gli screen reader annunciano i messaggi nuovi senza rileggere tutto. */}
      <ol role="log" aria-label="Messaggi" className="grid gap-2">
        {messages.map((message, index) => {
          const isMine = message.senderId === meId
          const day = formatDate(message.sentAt)
          // Il giorno si scrive solo quando cambia rispetto al messaggio prima.
          const previous = messages[index - 1]
          const showDay = previous === undefined || formatDate(previous.sentAt) !== day
          let author = 'Messaggio ricevuto'
          if (isMine) {
            author = 'Tu'
          }
          return (
            <li key={message.id} className="grid gap-2">
              {showDay && <p className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</p>}
              <div className={cn('flex flex-col items-start gap-1', isMine && 'items-end')}>
                <span className="sr-only">{author}:</span>
                {/* Testo scritto dagli utenti: mostrato come testo (a capo compresi), mai come HTML. */}
                <p className={cn(BUBBLE, THEIRS, isMine && MINE)}>{message.content}</p>
                <time dateTime={message.sentAt} className="px-1 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                  {formatTime(message.sentAt)}
                </time>
              </div>
            </li>
          )
        })}
        {pending.map((item) => (
          <li key={item.id} className="flex flex-col items-end gap-1">
            <p className={cn(BUBBLE, MINE, 'opacity-60')}>{item.content}</p>
            {!item.failed && <p className="px-1 text-[0.6875rem] text-muted-foreground">Invio…</p>}
            {item.failed && (
              <div className="flex items-center gap-1 text-xs text-destructive" role="alert">
                Non inviato
                <Button variant="ghost" size="icon-sm" onClick={() => onRetry(item.id)} aria-label="Riprova l'invio" title="Riprova">
                  <ArrowClockwiseIcon aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onDiscard(item.id)} aria-label="Scarta il messaggio" title="Scarta">
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div ref={endRef} />
    </div>
  )
}
