import type { ReactNode } from 'react'

interface ProfileSectionProps {
  /** Usato per collegare il titolo alla sezione (aria-labelledby). */
  id: string
  title: string
  description: string
  children: ReactNode
}

/** Riquadro di una sezione del profilo: titolo, spiegazione e contenuto. */
export function ProfileSection({ id, title, description, children }: ProfileSectionProps) {
  const titleId = `${id}-title`
  return (
    <section aria-labelledby={titleId} className="grid gap-5 rounded-2xl border bg-card p-6">
      <div className="grid gap-1">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      {children}
    </section>
  )
}
