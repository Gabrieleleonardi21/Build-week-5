import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * <select> del browser con lo stile dei campi di testo. Preferito al Select di shadcn per filtri e
 * ruoli: funziona nei form non controllati, e su mobile apre il selettore nativo del telefono.
 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:h-11 md:text-sm dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
