import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import { authKeys, getMe, login as loginRequest, logout as logoutRequest } from '@/features/auth/api'
import { setUnauthorizedHandler } from '@/lib/api'
import { refreshCsrf } from '@/lib/csrf'
import type { LoginRequest, UserResponse } from '@/lib/types'
import { uploadManager } from '@/lib/upload-manager'
import { AuthContext, type AuthContextValue } from './auth-context'

interface AuthProviderProps {
  children: ReactNode
}

// Cambio di utente (login, logout, sessione scaduta): via i dati dell'utente precedente.
// Non si usa queryClient.clear(): toglierebbe anche la query "me" osservata da questo provider,
// e il nuovo valore finirebbe in una query che nessuno guarda (la UI resterebbe "loggata").
function switchUser(queryClient: QueryClient, next: UserResponse | null): void {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.me[0] })
  queryClient.setQueryData(authKeys.me, next)
}

// Chi e' l'utente lo dice sempre il backend (GET /api/auth/me): nel browser non si salva nulla,
// la sessione e' un cookie HttpOnly che JavaScript non vede (D01, docs/API.md §1).
export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const me = useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => getMe(signal),
    // Retry: quello predefinito del QueryClient (shouldRetry), rete e 5xx si', 401 no.
    staleTime: Number.POSITIVE_INFINITY,
  })
  const user = me.data ?? null

  // Si torna anonimi: via i dati dell'utente dalla cache e gli upload in corso.
  const clearSession = useCallback(() => {
    uploadManager.cancelAll()
    switchUser(queryClient, null)
  }, [queryClient])

  // Il gestore del 401 legge l'utente da un ref: registrato una volta, sempre aggiornato.
  const userRef = useRef<UserResponse | null>(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    // 401 su una chiamata autenticata: sessione scaduta (2 h), logout da un'altra scheda, account disattivato.
    setUnauthorizedHandler(() => {
      if (userRef.current === null) {
        return
      }
      clearSession()
      toast.info('La sessione è scaduta: accedi di nuovo.')
    })
  }, [clearSession])

  const login = useCallback(
    async (credentials: LoginRequest): Promise<UserResponse> => {
      const logged = await loginRequest(credentials)
      // Il backend cambia il token CSRF al login: quello vecchio non vale piu'.
      await refreshCsrf()
      switchUser(queryClient, logged)
      return logged
    },
    [queryClient],
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest()
    } finally {
      // Anche se la chiamata fallisce (rete), nel browser si esce comunque.
      clearSession()
      await refreshCsrf().catch(() => undefined)
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: me.isPending,
      isError: me.isError,
      retry: () => void me.refetch(),
      login,
      logout,
    }),
    [user, me, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
