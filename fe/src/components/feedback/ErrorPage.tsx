import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

/** Errore imprevisto in una pagina (o rotta inesistente): messaggio e ritorno alla home. */
export function ErrorPage() {
  const error = useRouteError()
  let title = 'Qualcosa è andato storto'
  let description = 'Ricarica la pagina o torna alla home.'
  if (isRouteErrorResponse(error) && error.status === 404) {
    title = 'Pagina non trovata'
    description = "L'indirizzo non esiste o è stato spostato."
  }
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-md content-center justify-items-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <Button asChild>
        <Link to="/">Torna alla home</Link>
      </Button>
    </main>
  )
}

export function NotFoundPage() {
  return (
    <section className="mx-auto grid min-h-[60dvh] max-w-md content-center justify-items-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="text-muted-foreground">L'indirizzo non esiste o è stato spostato.</p>
      <Button asChild>
        <Link to="/">Torna alla home</Link>
      </Button>
    </section>
  )
}
