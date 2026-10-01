import { ArrowRightIcon, ChatsCircleIcon, MagnifyingGlassIcon, TicketIcon, XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '@/components/ui/button'

const KEY = 'tourevents-how-it-works-hidden'

const STEPS = [
  {
    icon: MagnifyingGlassIcon,
    title: 'Trova un evento',
    text: 'Cerca per nome, artista o città, oppure esplora la mappa.',
  },
  {
    icon: TicketIcon,
    title: 'Partecipa gratis',
    text: 'Apri l’evento e premi “Partecipa”: ricevi il ticket con il codice d’ingresso.',
  },
  {
    icon: ChatsCircleIcon,
    title: 'Conosci chi ci va',
    text: 'Aggiungi agli amici gli altri partecipanti e chattate prima della serata.',
  },
] as const

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Come funziona Tourevents, in tre passi: per chi arriva la prima volta. Si puo' nascondere. */
export function HowItWorks() {
  const { user, isLoading } = useAuth()
  const [hidden, setHidden] = useState(readHidden)

  if (hidden) {
    return null
  }

  function hide() {
    try {
      window.localStorage.setItem(KEY, '1')
    } catch {
      // Storage bloccato: resta nascosto solo per questa visita.
    }
    setHidden(true)
  }

  return (
    <section aria-labelledby="how-title" className="relative mb-12 grid gap-6 rounded-xl bg-foreground p-6 text-background md:p-8">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={hide}
        aria-label="Nascondi la guida"
        className="absolute top-3 right-3 text-background/70 hover:bg-background/10 hover:text-background"
      >
        <XIcon aria-hidden="true" />
      </Button>
      <h2 id="how-title" className="pr-10 text-2xl font-semibold text-balance">
        Come funziona Tourevents
      </h2>
      <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="grid content-start gap-2">
            <span className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
                <Icon size={22} />
              </span>
              <span className="text-sm text-background/60 tabular-nums">Passo {index + 1}</span>
            </span>
            <p className="font-heading text-lg font-semibold">{title}</p>
            <p className="text-sm leading-relaxed text-background/70">{text}</p>
          </li>
        ))}
      </ol>
      {!isLoading && user === null && (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="accent" size="lg">
            <Link to="/register">
              Registrati gratis
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
          <Link to="/login" className="text-sm underline underline-offset-4 hover:text-primary">
            Hai già un account? Accedi
          </Link>
        </div>
      )}
    </section>
  )
}
