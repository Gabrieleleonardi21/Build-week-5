import { useId, type ChangeEvent, type ReactNode } from 'react'
import { IMAGE_TYPES } from '@/lib/upload'
import { cn } from '@/lib/utils'

interface FilePickerButtonProps {
  /** Nome letto dagli screen reader (es. "Carica la locandina di Blue Trio"). */
  label: string
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
  children: ReactNode
}

/**
 * Bottone "scegli immagini": un <input type="file"> vero dentro la sua <label>, cosi' funziona con
 * tastiera e screen reader senza click simulati. L'input e' nascosto alla vista, non al focus.
 */
export function FilePickerButton({ label, multiple = false, disabled = false, onFiles, children }: FilePickerButtonProps) {
  const id = useId()

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Svuotato subito: scegliere di nuovo lo stesso file deve far ripartire onChange.
    event.target.value = ''
    if (files.length > 0) {
      onFiles(files)
    }
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex h-8 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 pointer-coarse:h-11 [&_svg]:size-4',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input id={id} type="file" className="sr-only" accept={IMAGE_TYPES.join(',')} multiple={multiple} disabled={disabled} aria-label={label} onChange={handleChange} />
      {children}
    </label>
  )
}
