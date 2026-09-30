import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { hasRole } from '@/lib/roles'
import type { Role } from '@/lib/types'
import { useAuth } from './auth-context'

// Le guardie sono solo comodita' per l'utente: i permessi veri li applica il backend (401/403).

function SessionLoading() {
  return <Skeleton className="mx-auto mt-10 h-64 w-full max-w-5xl" />
}

function ServerDown({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-10 grid max-w-md justify-items-center gap-4 text-center">
      <p className="text-muted-foreground">Il server non risponde. Riprova tra qualche secondo.</p>
      <Button variant="outline" onClick={onRetry}>
        Riprova
      </Button>
    </div>
  )
}

/** Serve il login; dopo l'accesso si torna alla pagina richiesta. */
export function RequireAuth() {
  const { user, isLoading, isError, retry } = useAuth()
  const location = useLocation()
  if (isLoading) {
    return <SessionLoading />
  }
  if (isError) {
    return <ServerDown onRetry={retry} />
  }
  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Serve almeno il ruolo indicato (es. MODERATOR per l'area admin). */
export function RequireRole({ min }: { min: Role }) {
  const { user, isLoading, isError, retry } = useAuth()
  const location = useLocation()
  if (isLoading) {
    return <SessionLoading />
  }
  if (isError) {
    return <ServerDown onRetry={retry} />
  }
  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (!hasRole(user, min)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

/** Login e registrazione: chi e' gia' loggato va alla home. */
export function RequireGuest() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return <SessionLoading />
  }
  if (user !== null) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
