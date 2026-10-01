import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { UserAvatar } from '@/components/data/UserAvatar'

interface UserLineProps {
  /** Vale per UserSummaryResponse e ParticipantResponse: stessi campi. */
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  /** Riga secondaria sotto il nome (es. "Amici dal…", evento in comune). */
  children?: ReactNode
}

/** Avatar + nome con link al profilo pubblico: la riga di un utente in tutte le liste social. */
export function UserLine({ user, children }: UserLineProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <UserAvatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} className="size-10" />
      <div className="min-w-0">
        <p className="truncate font-medium">
          <Link
            to={`/users/${user.id}`}
            className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {user.firstName} {user.lastName}
          </Link>
        </p>
        {children !== undefined && <div className="truncate text-sm text-muted-foreground">{children}</div>}
      </div>
    </div>
  )
}
