import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

/** Attributi da mettere sul controllo (input, select...) per collegarlo a etichetta ed errore. */
export interface FieldControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

interface FormFieldProps {
  id: string
  label: string
  /** Messaggio di errore (da react-hook-form o dal backend). */
  error?: string
  /** Aiuto sempre visibile sotto il campo. */
  description?: string
  children: (control: FieldControlProps) => ReactNode
}

/**
 * Etichetta sopra, aiuto e errore sotto (skill design-taste §4.6), collegati al controllo
 * con aria-describedby: gli screen reader leggono anche l'errore quando il campo ha il focus.
 */
export function FormField({ id, label, error, description, children }: FormFieldProps) {
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  const describedBy: string[] = []
  if (description !== undefined) {
    describedBy.push(descriptionId)
  }
  if (error !== undefined) {
    describedBy.push(errorId)
  }
  let ariaDescribedBy: string | undefined
  if (describedBy.length > 0) {
    ariaDescribedBy = describedBy.join(' ')
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': error !== undefined, 'aria-describedby': ariaDescribedBy })}
      {description !== undefined && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
