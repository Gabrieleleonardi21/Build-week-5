import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type { AdminUserResponse, Page, Role, StatusChangeRequest, UserStatus } from '@/lib/types'

export interface AdminUserSearchParams {
  q: string
  /** null = tutti i ruoli / tutti gli stati. */
  role: Role | null
  status: UserStatus | null
  /** Pagina da 0, come il backend. */
  page: number
  size?: number
}

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (params: AdminUserSearchParams) => [...adminKeys.users(), params] as const,
}

/** Elenco account con filtri (almeno MODERATOR). */
export function searchAdminUsers(params: AdminUserSearchParams, signal?: AbortSignal): Promise<Page<AdminUserResponse>> {
  const query = toQuery({ q: params.q, role: params.role, status: params.status, page: params.page, size: params.size })
  return api<Page<AdminUserResponse>>(`/api/admin/users${query}`, { signal })
}

/** Attiva o disattiva un account: disattivare chiude subito le sessioni dell'utente. */
export function changeUserStatus(id: string, status: StatusChangeRequest['status']): Promise<AdminUserResponse> {
  return api<AdminUserResponse>(`/api/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } })
}

/** Solo SUPERADMIN: l'utente dovra' accedere di nuovo per avere il ruolo nuovo. */
export function changeUserRole(id: string, role: Role): Promise<AdminUserResponse> {
  return api<AdminUserResponse>(`/api/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { role } })
}
