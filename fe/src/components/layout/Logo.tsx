import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  /** Mostra sotto la scritta "EVENTS / CULTURE / PEOPLE". */
  tagline?: boolean
}

/** Logotipo Tourevents: Plus Jakarta Sans bold, tracking stretto e punto viola finale. */
export function Logo({ className, tagline = false }: LogoProps) {
  return (
    <span className={cn('inline-grid gap-1.5', className)}>
      <span className="font-heading text-2xl leading-none font-bold tracking-[-0.045em]">
        Tourevents<span className="text-primary">.</span>
      </span>
      {tagline && (
        <span className="text-[0.625rem] tracking-[0.3em] text-muted-foreground uppercase" aria-hidden="true">
          Events / Culture / People
        </span>
      )}
    </span>
  )
}
