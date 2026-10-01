import { SparkleIcon, SpinnerIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCountdown } from '@/hooks/useCountdown'
import { ApiError, errorMessage } from '@/lib/errors'
import { formatWait } from '@/lib/wait'
import { useAiProposal } from '../../hooks/useEventMutations'
import type { DescriptionAccess } from './EventForm'

interface AiDescriptionProps {
  eventId: string
  access: DescriptionAccess
}

// Limite del backend: 10 proposte ogni 15 minuti. Senza Retry-After si aspetta un minuto.
const DEFAULT_WAIT_SECONDS = 60

/**
 * "Migliora con AI": propone una descrizione a partire dalla bozza nel campo (o da quella salvata
 * se il campo e' vuoto). La proposta non si salva da sola: "Usa questa" la mette nel campo.
 */
export function AiDescription({ eventId, access }: AiDescriptionProps) {
  const proposal = useAiProposal(eventId)
  const wait = useCountdown()
  const [error, setError] = useState<string>()

  function ask() {
    setError(undefined)
    proposal.mutate(access.getText(), {
      onError: (failure) => {
        if (failure instanceof ApiError && failure.status === 429) {
          const seconds = failure.retryAfterSeconds ?? DEFAULT_WAIT_SECONDS
          wait.start(seconds)
          setError(`Hai chiesto molte proposte. Riprova tra ${formatWait(seconds)}.`)
          return
        }
        // 503: i modelli gratuiti sono spesso saturi, basta riprovare.
        setError(errorMessage(failure))
      },
    })
  }

  function use(text: string) {
    access.setText(text)
    proposal.reset()
  }

  let label = 'Migliora con AI'
  let icon = <SparkleIcon data-icon="inline-start" aria-hidden="true" />
  if (error !== undefined) {
    label = 'Riprova'
  }
  if (wait.seconds > 0) {
    label = `Riprova tra ${formatWait(wait.seconds)}`
  }
  if (proposal.isPending) {
    label = "L'AI sta scrivendo…"
    icon = <SpinnerIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" className="pointer-coarse:h-11" onClick={ask} disabled={proposal.isPending || wait.seconds > 0}>
          {icon}
          {label}
        </Button>
        {error !== undefined && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      {proposal.data !== undefined && (
        <section aria-label="Proposta dell'AI" className="grid gap-3 rounded-xl border bg-muted/40 p-4">
          <p className="text-xs font-medium text-muted-foreground">Proposta dell'AI: controllala prima di usarla.</p>
          {/* Testo generato: mostrato come testo (a capo compresi), mai come HTML. */}
          <p className="max-w-prose whitespace-pre-line text-sm">{proposal.data.proposal}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="pointer-coarse:h-11" onClick={() => use(proposal.data.proposal)}>
              Usa questa
            </Button>
            <Button type="button" variant="ghost" size="sm" className="pointer-coarse:h-11" onClick={() => proposal.reset()}>
              Scarta
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
