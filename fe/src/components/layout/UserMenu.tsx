import { SignOutIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { ACCOUNT_NAV } from '@/app/nav'
import { useAuth } from '@/components/auth/auth-context'
import { UserAvatar } from '@/components/data/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { showError } from '@/lib/errors'
import { hasRole } from '@/lib/roles'
import type { UserResponse } from '@/lib/types'

interface UserMenuProps {
  user: UserResponse
}

/** Avatar in alto a destra: area personale ed uscita. */
export function UserMenu({ user }: UserMenuProps) {
  const { logout } = useAuth()
  const items = ACCOUNT_NAV.filter((item) => item.minRole === undefined || hasRole(user, item.minRole))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={`Menu di ${user.firstName} ${user.lastName}`}
      >
        <UserAvatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} className="size-9 pointer-coarse:size-11" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="grid">
          <span className="truncate font-medium">
            {user.firstName} {user.lastName}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild className="items-start py-2">
            <Link to={item.to}>
              {item.icon !== undefined && <item.icon className="mt-0.5" aria-hidden="true" />}
              <span className="grid">
                <span className="font-medium">{item.label}</span>
                {/* Il nome accessibile resta l'etichetta: la spiegazione e' solo visiva. */}
                {item.hint !== undefined && (
                  <span className="text-xs text-muted-foreground" aria-hidden="true">
                    {item.hint}
                  </span>
                )}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout().catch(showError)}>
          <SignOutIcon aria-hidden="true" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
