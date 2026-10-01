import { cn } from '@/lib/utils'

const STEPS = [
  { title: 'Iscriviti a un evento', text: 'Le amicizie nascono tra chi partecipa allo stesso evento.' },
  { title: 'Trova chi ci va con te', text: 'Nella pagina dell’evento, sotto “Partecipanti”, oppure cercandolo per nome.' },
  { title: 'Aggiungilo e chattate', text: 'Quando accetta la richiesta potete scrivervi nella chat.' },
] as const

/**
 * Le tre mosse per fare amicizia: la regola del backend (D12, stesso evento) spiegata prima che
 * l'utente ci sbatta contro. Sequenza vera, quindi numerata.
 */
export function HowFriendsWork({ className }: { className?: string }) {
  return (
    <section aria-labelledby="how-friends-title" className={cn('grid gap-4 rounded-lg border bg-card p-5', className)}>
      <h2 id="how-friends-title" className="text-base font-semibold">
        Come si aggiungono amici
      </h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[auto_1fr] gap-3">
            <span
              className="grid size-7 place-items-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground tabular-nums"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="grid gap-0.5">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
