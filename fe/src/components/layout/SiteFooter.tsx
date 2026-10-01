import { ArrowRightIcon, FacebookLogoIcon, InstagramLogoIcon, LinkedinLogoIcon, XLogoIcon } from '@phosphor-icons/react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { MAIN_NAV } from '@/app/nav'
import { OPEN_COOKIE_BANNER } from '@/lib/cookie-consent'
import { Logo } from './Logo'

const SOCIAL = [
  { label: 'Instagram', href: 'https://www.instagram.com', icon: InstagramLogoIcon },
  { label: 'Facebook', href: 'https://www.facebook.com', icon: FacebookLogoIcon },
  { label: 'X', href: 'https://x.com', icon: XLogoIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: LinkedinLogoIcon },
] as const

const LINK =
  'rounded-sm text-sm text-[#a3a3ad] transition-colors hover:text-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Footer scuro della brand identity: logo, navigazione, social, newsletter e note legali. */
export function SiteFooter() {
  const [email, setEmail] = useState('')

  const subscribe = (event: FormEvent) => {
    event.preventDefault()
    toast.success('Grazie! Ti abbiamo iscritto alla newsletter.')
    setEmail('')
  }

  return (
    <footer className="bg-[#0b0b0d] text-[#f5f4f1] dark:border-t dark:border-white/10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <Logo tagline className="content-start self-start [&>span:last-child]:text-[#a3a3ad]" />
        <nav aria-label="Navigazione del sito" className="grid content-start gap-3">
          <h2 className="text-sm font-semibold">Navigazione</h2>
          {MAIN_NAV.map((item) => (
            <Link key={item.to} to={item.to} className={LINK}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="grid content-start gap-3">
          <h2 className="text-sm font-semibold">Seguici</h2>
          {SOCIAL.map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className={LINK}>
              {label}
            </a>
          ))}
        </div>
        <form onSubmit={subscribe} className="grid content-start gap-3">
          <label htmlFor="newsletter-email" className="text-sm font-semibold">
            Iscriviti alla newsletter
          </label>
          <div className="flex items-center rounded-md border border-white/20 focus-within:border-[#6c63ff] focus-within:ring-[3px] focus-within:ring-[#6c63ff]/40">
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="La tua email"
              autoComplete="email"
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white placeholder:text-[#6b6b73] outline-none"
            />
            <button
              type="submit"
              aria-label="Iscriviti"
              className="grid size-11 shrink-0 place-items-center text-white outline-none hover:text-[#8f88ff]"
            >
              <ArrowRightIcon aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-4 py-6">
        <p className="text-xs text-[#a3a3ad]">© {new Date().getFullYear()} Tourevents. Tutti i diritti riservati.</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to="/privacy" className={LINK}>
            Privacy
          </Link>
          <button type="button" className={LINK} onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_BANNER))}>
            Cookie
          </button>
          <div className="flex items-center gap-3">
            {SOCIAL.map(({ label, href, icon: Icon }) => (
              <span key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-md text-white transition-colors hover:text-[#8f88ff] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Icon size={20} aria-hidden="true" />
                </a>
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
