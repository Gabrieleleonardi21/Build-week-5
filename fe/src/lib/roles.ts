import type { Role } from './types'

// Stessa gerarchia del backend (Role.isAtLeast): ogni ruolo ha i permessi dei precedenti.
const ORDER: readonly Role[] = ['USER', 'MODERATOR', 'SUPERADMIN']

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  USER: 'Utente',
  MODERATOR: 'Moderatore',
  SUPERADMIN: 'Super amministratore',
}

/** Solo per mostrare/nascondere la UI: i permessi veri li controlla il backend (403). */
export function hasRole(user: { role: Role } | null | undefined, min: Role): boolean {
  if (user === null || user === undefined) {
    return false
  }
  return ORDER.indexOf(user.role) >= ORDER.indexOf(min)
}
