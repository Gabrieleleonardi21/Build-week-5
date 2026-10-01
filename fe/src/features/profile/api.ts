import { api } from '@/lib/api'
import type { ChangePasswordRequest, DeleteAccountRequest, ProfileResponse, UpdateProfileRequest } from '@/lib/types'

export const profileKeys = {
  me: ['profile', 'me'] as const,
}

/** Profilo completo dell'utente loggato (GET /api/auth/me resta quello leggero dell'header). */
export function getProfile(signal?: AbortSignal): Promise<ProfileResponse> {
  return api<ProfileResponse>('/api/me', { signal })
}

/** PUT: sostituisce tutti i dati anagrafici (l'email non si cambia). */
export function updateProfile(body: UpdateProfileRequest): Promise<ProfileResponse> {
  return api<ProfileResponse>('/api/me', { method: 'PUT', body })
}

/** 204: le altre sessioni dell'utente vengono chiuse, questa resta aperta. */
export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return api<void>('/api/me/password', { method: 'PUT', body })
}

export function deleteAvatar(): Promise<void> {
  return api<void>('/api/me/avatar', { method: 'DELETE' })
}

/** Anonimizzazione dell'account (D15): dopo il 204 la sessione non esiste piu'. */
export function deleteAccount(body: DeleteAccountRequest): Promise<void> {
  return api<void>('/api/me', { method: 'DELETE', body })
}
