import {
  CalendarPlusIcon,
  ChatsCircleIcon,
  ShieldCheckIcon,
  TicketIcon,
  UserCircleIcon,
  UsersIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  label: string
  /** Serve il login; se c'e' anche minRole serve almeno quel ruolo. */
  requiresAuth?: boolean
  minRole?: Role
  /** Icona e mezza riga di spiegazione nel menu dell'account: si capisce cosa c'e' prima di aprire. */
  icon?: Icon
  hint?: string
}

/** Navigazione principale (header desktop e menu mobile). */
export const MAIN_NAV: readonly NavItem[] = [
  { to: '/', label: 'Eventi' },
  { to: '/map', label: 'Mappa' },
  { to: '/artists', label: 'Artisti' },
]

/** Area personale (menu dell'account e menu mobile). */
export const ACCOUNT_NAV: readonly NavItem[] = [
  { to: '/me/tickets', label: 'I miei ticket', requiresAuth: true, icon: TicketIcon, hint: 'Eventi a cui partecipi' },
  { to: '/me/events', label: 'I miei eventi', requiresAuth: true, icon: CalendarPlusIcon, hint: 'Eventi che organizzi' },
  { to: '/friends', label: 'Amici', requiresAuth: true, icon: UsersIcon, hint: 'Richieste e persone conosciute' },
  { to: '/chats', label: 'Chat', requiresAuth: true, icon: ChatsCircleIcon, hint: 'Messaggi con i tuoi amici' },
  { to: '/profile', label: 'Profilo', requiresAuth: true, icon: UserCircleIcon, hint: 'Dati, foto e password' },
  {
    to: '/admin/users',
    label: 'Moderazione',
    requiresAuth: true,
    minRole: 'MODERATOR',
    icon: ShieldCheckIcon,
    hint: 'Gestione degli account',
  },
]
