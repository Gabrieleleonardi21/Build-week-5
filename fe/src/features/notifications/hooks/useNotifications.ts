import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getNotifications, getUnreadCount, markNotificationRead, notificationKeys } from '../api'

// Il contatore si aggiorna in tempo reale (RealtimeProvider); se il WebSocket cade
// si rilegge comunque ogni minuto, cosi' il badge non resta fermo.
const UNREAD_REFRESH_MS = 60_000

/** Notifiche paginate; cambiando pagina la lista vecchia resta finche' arriva la nuova. */
export function useNotifications(page: number) {
  return useQuery({
    queryKey: notificationKeys.list(page),
    queryFn: ({ signal }) => getNotifications(page, signal),
    placeholderData: keepPreviousData,
  })
}

/** Numero di notifiche non lette (badge sulla campanella e titolo della pagina). */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: ({ signal }) => getUnreadCount(signal),
    refetchInterval: UNREAD_REFRESH_MS,
  })
}

/** Segna come lette una o piu' notifiche, poi ricarica liste e contatore. */
export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) => Promise.all(ids.map((id) => markNotificationRead(id))),
    // Anche se una chiamata fallisce le altre possono essere riuscite: si rilegge comunque.
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
