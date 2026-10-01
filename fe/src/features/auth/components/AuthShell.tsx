import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  description: string
  children: ReactNode
  /** Link sotto il riquadro (es. "Non hai un account? Registrati"). */
  footer?: ReactNode
}

/** Layout comune di accesso, registrazione e verifica: un riquadro stretto, niente distrazioni. */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 py-12 md:py-16">
      <title>{`${title} · Tourevents`}</title>
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <div className="rounded-xl border bg-card p-6">{children}</div>
      {footer !== undefined && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
}
