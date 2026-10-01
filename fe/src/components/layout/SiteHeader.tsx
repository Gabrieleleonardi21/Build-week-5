import { ArrowRightIcon, ChatsCircleIcon, PlusIcon } from '@phosphor-icons/react'
import { Link, NavLink } from 'react-router'
import { MAIN_NAV } from '@/app/nav'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { MobileNav } from './MobileNav'
import { NotificationBell } from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    isActive && 'text-foreground font-medium',
  )
}

/** Intestazione di tutte le pagine: una riga sola, 64 px (skill design-taste §4.7). */
export function SiteHeader() {
  const { user, isLoading } = useAuth()

  // Durante il primo caricamento non si mostrano ne' "Accedi" ne' l'avatar: niente sfarfallio.
  let account = null
  if (!isLoading && user === null) {
    account = (
      <>
        <Button asChild variant="ghost" className="hidden sm:inline-flex">
          <Link to="/login">Accedi</Link>
        </Button>
        <Button asChild>
          <Link to="/register">
            Registrati
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
      </>
    )
  }
  if (!isLoading && user !== null) {
    account = (
      <>
        <Button asChild className="hidden sm:inline-flex">
          <Link to="/events/new">
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Crea evento
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon-lg" className="pointer-coarse:size-11">
          <Link to="/chats" aria-label="Chat" title="Chat">
            <ChatsCircleIcon aria-hidden="true" />
          </Link>
        </Button>
        <NotificationBell />
        <UserMenu user={user} />
      </>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        <MobileNav user={user} />
        <Link to="/" aria-label="Tourevents, home" className="mr-6 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <nav aria-label="Principale" className="hidden items-center gap-1 md:flex">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {account}
        </div>
      </div>
    </header>
  )
}
