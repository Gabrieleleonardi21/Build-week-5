import { createContext, useContext } from 'react'
import type { LoginRequest, UserResponse } from '@/lib/types'

export interface AuthContextValue {
  /** null = non loggato (o in caricamento: vedi isLoading). */
  user: UserResponse | null
  isLoading: boolean
  /** Il backend non risponde (rete, cold start): diverso da "non loggato". */
  isError: boolean
  retry: () => void
  login: (credentials: LoginRequest) => Promise<UserResponse>
  logout: () => Promise<void>
  /** La sessione e' gia' chiusa sul server (es. account eliminato): si azzera solo il browser, senza POST /logout. */
  clearSession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth va usato dentro <AuthProvider>')
  }
  return value
}
