import { PaperPlaneRightIcon } from '@phosphor-icons/react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Stesso limite del backend (ChatMessagingService.MAX_LENGTH).
export const MAX_MESSAGE_LENGTH = 2000

interface MessageComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  /** Il WebSocket e' collegato: senza, il messaggio non partirebbe. */
  connected: boolean
  /** Motivo per cui non si puo' piu' scrivere (amicizia tolta, account non attivo), oppure null. */
  readOnlyReason: string | null
}

/** Campo del messaggio: Invio manda, Maiusc+Invio va a capo. */
export function MessageComposer({ value, onChange, onSend, connected, readOnlyReason }: MessageComposerProps) {
  if (readOnlyReason !== null) {
    return <p className="border-t px-4 py-4 text-center text-sm text-muted-foreground">{readOnlyReason}</p>
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSend()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: con le tastiere a composizione (es. giapponese) Invio conferma la parola, non invia.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onSend()
    }
  }

  const canSend = connected && value.trim() !== ''
  return (
    <form onSubmit={handleSubmit} className="grid gap-2 border-t p-3">
      <div className="flex items-end gap-2">
        <Label htmlFor="chat-message" className="sr-only">
          Messaggio
        </Label>
        <Textarea
          id="chat-message"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Scrivi un messaggio…"
          autoComplete="off"
          aria-describedby="chat-message-status"
          className="max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" size="icon-lg" className="size-10 shrink-0 pointer-coarse:size-11" disabled={!canSend} aria-label="Invia" title="Invia">
          <PaperPlaneRightIcon aria-hidden="true" />
        </Button>
      </div>
      {/* Sempre presente (anche vuoto): aria-live annuncia quando la connessione torna o cade. */}
      <p id="chat-message-status" aria-live="polite" className="min-h-4 px-1 text-xs text-muted-foreground">
        {!connected && 'Connessione alla chat in corso…'}
      </p>
    </form>
  )
}
