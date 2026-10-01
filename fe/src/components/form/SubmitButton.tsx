import { SpinnerIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface SubmitButtonProps {
  isPending: boolean
  pendingLabel: string
  disabled?: boolean
  /** Di default occupa tutta la larghezza (form stretti); nei form larghi si passa es. "w-fit". */
  className?: string
  children: ReactNode
}

/** Bottone di invio: resta attivo finche' la richiesta non parte, poi mostra l'attesa. */
export function SubmitButton({ isPending, pendingLabel, disabled, className = 'w-full', children }: SubmitButtonProps) {
  let content = children
  if (isPending) {
    content = (
      <>
        <SpinnerIcon className="animate-spin" data-icon="inline-start" aria-hidden="true" />
        {pendingLabel}
      </>
    )
  }
  return (
    <Button type="submit" className={className} disabled={isPending || disabled === true}>
      {content}
    </Button>
  )
}
