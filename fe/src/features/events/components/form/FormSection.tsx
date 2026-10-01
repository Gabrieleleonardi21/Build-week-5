import type { ReactNode } from 'react'

interface FormSectionProps {
  /** Id del titolo, per aria-labelledby. */
  id: string
  title: string
  description?: string
  children: ReactNode
}

/** Una sezione del form evento: titolo, riga di spiegazione e contenuto, tutte con lo stesso ritmo. */
export function FormSection({ id, title, description, children }: FormSectionProps) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t pt-8">
      <div className="grid gap-1">
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description !== undefined && <p className="max-w-prose text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Stesso aspetto di <Input> per i <select> nativi (su mobile aprono il selettore del sistema). */
export const SELECT_CLASS =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30'
