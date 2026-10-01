import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router'
import { UserAvatar } from '@/components/data/UserAvatar'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/errors'
import type { UserSummaryResponse } from '@/lib/types'
import { usePublicUser } from '../hooks/useFriends'

function ProfileSkeleton() {
  return (
    <div className="grid justify-items-center gap-4" aria-label="Caricamento profilo…">
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="h-7 w-48" />
    </div>
  )
}

function UserNotFound() {
  return (
    <div className="grid justify-items-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-semibold text-balance">Utente non trovato</h1>
      <p className="text-muted-foreground">L'account non esiste più o è stato disattivato.</p>
      <Button asChild>
        <Link to="/friends">Vai ai tuoi amici</Link>
      </Button>
    </div>
  )
}

function Profile({ user }: { user: UserSummaryResponse }) {
  const name = `${user.firstName} ${user.lastName}`
  return (
    <div className="grid justify-items-center gap-4 text-center">
      <title>{`${name} · Eventi`}</title>
      <UserAvatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} className="size-24 text-2xl" />
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{name}</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        Per diventare amici iscrivetevi allo stesso evento: la richiesta si invia dalla lista dei partecipanti.
      </p>
    </div>
  )
}

/** Profilo pubblico (/users/:id): solo nome e avatar, i dati che il backend espone a ogni utente loggato. */
export function UserProfilePage() {
  const { id = '' } = useParams()
  const user = usePublicUser(id)

  let content = (
    <QueryState query={user} loading={<ProfileSkeleton />}>
      {(data) => <Profile user={data} />}
    </QueryState>
  )
  if (user.error instanceof ApiError && user.error.status === 404) {
    content = <UserNotFound />
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 pb-16">
      <Button asChild variant="ghost" className="w-fit">
        <Link to="/friends">
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Amici
        </Link>
      </Button>
      {content}
    </div>
  )
}
