import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  label: string
  /** Serve il login; se c'e' anche minRole serve almeno quel ruolo. */
  requiresAuth?: boolean
  minRole?: Role
}

/** Navigazione principale (header desktop e menu mobile). */
export const MAIN_NAV: readonly NavItem[] = [
  { to: '/', label: 'Eventi' },
  { to: '/map', label: 'Mappa' },
  { to: '/artists', label: 'Artisti' },
]

/** Area personale (menu dell'account e menu mobile). */
export const ACCOUNT_NAV: readonly NavItem[] = [
  { to: '/me/tickets', label: 'I miei ticket', requiresAuth: true },
  { to: '/me/events', label: 'I miei eventi', requiresAuth: true },
  { to: '/friends', label: 'Amici', requiresAuth: true },
  { to: '/chats', label: 'Chat', requiresAuth: true },
  { to: '/profile', label: 'Profilo', requiresAuth: true },
  { to: '/admin/users', label: 'Moderazione', requiresAuth: true, minRole: 'MODERATOR' },
]
