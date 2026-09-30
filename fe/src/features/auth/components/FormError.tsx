interface FormErrorProps {
  message: string | undefined
}

/** Errore generale del form (non legato a un campo), letto subito dagli screen reader. */
export function FormError({ message }: FormErrorProps) {
  if (message === undefined) {
    return null
  }
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
