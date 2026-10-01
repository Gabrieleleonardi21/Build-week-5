import type { AdminUserResponse, Role, UserResponse, UserStatus } from '@/lib/types'

// Stesse regole di AdminUserService nel backend. Servono solo a non mostrare comandi che
// verrebbero rifiutati: i permessi veri li controlla sempre il backend (400/403).

export const ROLES: readonly Role[] = ['USER', 'MODERATOR', 'SUPERADMIN']
export const STATUSES: readonly UserStatus[] = ['ACTIVE', 'PENDING_VERIFICATION', 'DEACTIVATED']

export const STATUS_LABEL: Readonly<Record<UserStatus, string>> = {
  ACTIVE: 'Attivo',
  PENDING_VERIFICATION: 'Da verificare',
  DEACTIVATED: 'Disattivato',
}

/** Valore di un filtro preso dall'URL: se non e' tra quelli ammessi si ignora (niente 400 dal backend). */
export function parseOption<T extends string>(value: string, allowed: readonly T[]): T | null {
  return allowed.find((option) => option === value) ?? null
}

/** Nessuno modifica se stesso, e gli account eliminati (anonimizzati) non si toccano piu'. */
function isEditable(me: UserResponse, target: AdminUserResponse): boolean {
  return target.id !== me.id && target.anonymizedAt === null
}

/** Un MODERATOR gestisce solo gli account USER; un SUPERADMIN anche moderatori e altri SUPERADMIN. */
export function canChangeStatus(me: UserResponse, target: AdminUserResponse): boolean {
  if (!isEditable(me, target)) {
    return false
  }
  return me.role === 'SUPERADMIN' || target.role === 'USER'
}

export function canChangeRole(me: UserResponse, target: AdminUserResponse): boolean {
  return me.role === 'SUPERADMIN' && isEditable(me, target)
}
