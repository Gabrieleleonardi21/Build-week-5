import { ListIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { NavLink } from 'react-router'
import { ACCOUNT_NAV, MAIN_NAV, type NavItem } from '@/app/nav'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { hasRole } from '@/lib/roles'
import type { UserResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

interface MobileNavProps {
  user: UserResponse | null
}

function visible(items: readonly NavItem[], user: UserResponse | null): NavItem[] {
  return items.filter((item) => {
    if (item.requiresAuth === true && user === null) {
      return false
    }
    return item.minRole === undefined || hasRole(user, item.minRole)
  })
}

function linkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex min-h-11 items-center rounded-lg px-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    isActive && 'bg-muted font-medium text-foreground',
  )
}

/** Menu a scomparsa sotto i 768 px: tutte le voci, con aree di tocco da 44 px. */
export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const account = visible(ACCOUNT_NAV, user)
  // Sotto i 640 px "Accedi" e "Crea evento" non stanno nell'header: qui restano sempre raggiungibili.
  let actions: readonly NavItem[] = [{ to: '/login', label: 'Accedi' }, { to: '/register', label: 'Registrati' }]
  if (user !== null) {
    actions = [{ to: '/events/new', label: 'Crea evento' }]
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="size-11 md:hidden" aria-label="Apri il menu">
          <ListIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto overscroll-contain p-4">
        <SheetHeader className="p-0">
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Menu mobile" className="grid gap-1">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass} onClick={close}>
              {item.label}
            </NavLink>
          ))}
          <hr className="my-2" />
          {actions.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={close}>
              {item.label}
            </NavLink>
          ))}
          {account.length > 0 && <hr className="my-2" />}
          {account.map((item) => (
            <NavLink key={item.to} to={item.to} className={(state) => cn(linkClass(state), 'gap-3')} onClick={close}>
              {item.icon !== undefined && <item.icon aria-hidden="true" />}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
