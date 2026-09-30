import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { showError } from '@/lib/errors'

interface ConfirmDialogProps {
  /** Bottone che apre la conferma. */
  trigger: ReactNode
  title: string
  description: string
  confirmLabel: string
  /** true per le azioni irreversibili (cancella, elimina account): bottone rosso. */
  destructive?: boolean
  onConfirm: () => Promise<unknown> | void
}

/** Conferma prima delle azioni distruttive; resta aperta e mostra l'errore se l'azione fallisce. */
export function ConfirmDialog({ trigger, title, description, confirmLabel, destructive, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleConfirm(event: React.MouseEvent) {
    // Il dialog si chiude solo se l'azione riesce.
    event.preventDefault()
    setIsPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (error: unknown) {
      showError(error)
    } finally {
      setIsPending(false)
    }
  }

  let variant: 'default' | 'destructive' = 'default'
  if (destructive === true) {
    variant = 'destructive'
  }
  let label = confirmLabel
  if (isPending) {
    label = 'Attendere…'
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction variant={variant} onClick={handleConfirm} disabled={isPending}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
