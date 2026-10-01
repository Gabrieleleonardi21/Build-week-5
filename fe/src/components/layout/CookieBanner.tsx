import { CheckIcon, CookieIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { type CookieChoice, OPEN_COOKIE_BANNER, readCookieChoice, saveCookieChoice } from '@/lib/cookie-consent'

/** Pop up dei cookie: compare alla prima visita e finche' l'utente non sceglie. */
export function CookieBanner() {
  const [open, setOpen] = useState(() => readCookieChoice() === null)

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_COOKIE_BANNER, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_BANNER, reopen)
  }, [])

  if (!open) {
    return null
  }

  const choose = (choice: CookieChoice) => {
    saveCookieChoice(choice)
    setOpen(false)
  }

  return (
    <div
      role="region"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-text"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl border border-white/10 bg-[#0b0b0d] p-5 text-[#f5f4f1] shadow-2xl sm:right-auto sm:left-4 sm:mx-0 sm:w-[26rem]"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#6c63ff] text-white" aria-hidden="true">
          <CookieIcon size={22} />
        </span>
        <div className="grid gap-1.5">
          <h2 id="cookie-title" className="text-lg font-semibold">
            Usiamo i cookie
          </h2>
          <p id="cookie-text" className="text-sm leading-relaxed text-[#a3a3ad]">
            Usiamo cookie tecnici per farti accedere e, se accetti, altri per migliorare l&apos;esperienza.{' '}
            <Link to="/privacy" className="text-[#f5f4f1] underline underline-offset-4 hover:text-[#8f88ff]">
              Leggi la privacy
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="border-white/40 text-[#f5f4f1] hover:bg-[#f5f4f1] hover:text-[#0b0b0d] dark:border-white/40 dark:hover:bg-[#f5f4f1] dark:hover:text-[#0b0b0d]"
          onClick={() => choose('rejected')}
        >
          <XIcon data-icon="inline-start" aria-hidden="true" />
          Rifiuta
        </Button>
        <Button variant="accent" size="lg" onClick={() => choose('accepted')}>
          <CheckIcon data-icon="inline-start" aria-hidden="true" />
          Accetta
        </Button>
      </div>
    </div>
  )
}
