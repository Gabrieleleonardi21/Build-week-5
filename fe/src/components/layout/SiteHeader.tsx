import { SignOutIcon } from '@phosphor-icons/react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/components/auth/auth-context'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errors'
import { hasRole } from '@/lib/roles'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
}

const PUBLIC_NAV: readonly NavItem[] = [
  { to: '/', label: 'Eventi' },
  { to: '/map', label: 'Mappa' },
  { to: '/artists', label: 'Artisti' },
]

const USER_NAV: readonly NavItem[] = [
  { to: '/me/tickets', label: 'I miei ticket' },
  { to: '/chats', label: 'Chat' },
  { to: '/notifications', label: 'Notifiche' },
]

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
    isActive && 'bg-muted text-foreground',
  )
}

/** Intestazione provvisoria: la versione definitiva arriva con la direzione di design. */
export function SiteHeader() {
  const { user, logout } = useAuth()
  let items = PUBLIC_NAV
  if (user !== null) {
    items = [...PUBLIC_NAV, ...USER_NAV]
  }

  let account = (
    <Button asChild size="sm">
      <Link to="/login">Accedi</Link>
    </Button>
  )
  if (user !== null) {
    account = (
      <div className="flex items-center gap-2">
        {hasRole(user, 'MODERATOR') && (
          <NavLink to="/admin/users" className={navClass}>
            Admin
          </NavLink>
        )}
        <NavLink to="/profile" className={navClass}>
          {user.firstName}
        </NavLink>
        <Button variant="ghost" size="icon" aria-label="Esci" onClick={() => logout().catch(showError)}>
          <SignOutIcon />
        </Button>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="font-semibold tracking-tight">
          Eventi
        </Link>
        <nav aria-label="Principale" className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {account}
      </div>
    </header>
  )
}
