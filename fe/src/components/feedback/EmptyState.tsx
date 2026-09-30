import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  /** Cosa fare per riempire la lista (es. "Crea il tuo primo evento"). */
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      {icon !== undefined && (
        <div className="text-muted-foreground [&_svg]:size-8" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold text-balance">{title}</h2>
      {description !== undefined && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
