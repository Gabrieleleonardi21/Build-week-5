import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { ApiError } from './errors'

// "lineup[0].artistName" (Spring) -> "lineup.0.artistName" (react-hook-form).
function toFieldPath(field: string): string {
  return field.replace(/\[(\d+)\]/g, '.$1')
}

/**
 * Mette sotto ogni campo gli errori di validazione del backend (ProblemDetail.errors).
 * Se un campo non esiste nel form, il messaggio va in root.server (mostrato in cima).
 * Restituisce true se c'era almeno un errore di campo.
 */
export function applyFieldErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false
  }
  const entries = Object.entries(error.fieldErrors)
  if (entries.length === 0) {
    return false
  }
  const known = new Set(Object.keys(form.getValues()))
  for (const [field, message] of entries) {
    const path = toFieldPath(field)
    const root = path.split('.')[0] ?? path
    if (known.has(root)) {
      form.setError(path as Path<T>, { type: 'server', message })
    } else {
      form.setError('root.server', { type: 'server', message })
    }
  }
  return true
}
