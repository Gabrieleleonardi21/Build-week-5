import { api } from '@/lib/api'
import { ApiError } from '@/lib/errors'
import type { LoginRequest, RegisterRequest, UserResponse, VerifyRequest } from '@/lib/types'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

/** Utente della sessione, oppure null se non si e' loggati (401 = anonimo, non un errore). */
export async function getMe(signal?: AbortSignal): Promise<UserResponse | null> {
  try {
    return await api<UserResponse>('/api/auth/me', { signal, session: false })
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

export function login(body: LoginRequest): Promise<UserResponse> {
  return api<UserResponse>('/api/auth/login', { method: 'POST', body, session: false })
}

export function logout(): Promise<void> {
  return api<void>('/api/auth/logout', { method: 'POST', session: false })
}

export function register(body: RegisterRequest): Promise<UserResponse> {
  return api<UserResponse>('/api/auth/register', { method: 'POST', body, session: false })
}

export function verifyEmail(body: VerifyRequest): Promise<void> {
  return api<void>('/api/auth/verify', { method: 'POST', body, session: false })
}

export function resendCode(email: string): Promise<void> {
  return api<void>('/api/auth/resend-code', { method: 'POST', body: { email }, session: false })
}
