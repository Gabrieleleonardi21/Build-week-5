interface PlaceholderPageProps {
  title: string
  description: string
}

/** Pagina provvisoria dello scaffolding: la sostituisce la pagina vera della feature. */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>
    </section>
  )
}
