import { SpinnerIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface SubmitButtonProps {
  isPending: boolean
  pendingLabel: string
  disabled?: boolean
  children: ReactNode
}

/** Bottone di invio: resta attivo finche' la richiesta non parte, poi mostra l'attesa. */
export function SubmitButton({ isPending, pendingLabel, disabled, children }: SubmitButtonProps) {
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
    <Button type="submit" className="w-full" disabled={isPending || disabled === true}>
      {content}
    </Button>
  )
}
