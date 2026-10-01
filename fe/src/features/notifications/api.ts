import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type { NotificationResponse, Page, UnreadCountResponse } from '@/lib/types'

// Chiavi della cache delle notifiche: le usa anche il tempo reale (nuova notifica -> contatore e liste).
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (page: number) => [...notificationKeys.lists(), page] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
}

/** Le mie notifiche, dalla piu' recente (GET /api/notifications). */
export function getNotifications(page: number, signal?: AbortSignal): Promise<Page<NotificationResponse>> {
  return api<Page<NotificationResponse>>(`/api/notifications${toQuery({ page })}`, { signal })
}

/** Numero di notifiche non lette, per il badge sulla campanella. */
export function getUnreadCount(signal?: AbortSignal): Promise<UnreadCountResponse> {
  return api<UnreadCountResponse>('/api/notifications/unread-count', { signal })
}

export function markNotificationRead(id: string): Promise<void> {
  return api<void>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
}
