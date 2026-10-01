import { BellSlashIcon, ChecksIcon } from '@phosphor-icons/react'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { showError } from '@/lib/errors'
import type { NotificationResponse } from '@/lib/types'
import { NotificationItem } from '../components/NotificationItem'
import { useMarkRead, useNotifications, useUnreadCount } from '../hooks/useNotifications'

// Nessun filtro: nell'URL c'e' solo la pagina (?page=2), cosi' Indietro funziona.
const NO_FILTERS = [] as const
const SKELETON_ROWS = 5

function unreadLabel(unread: number): string {
  if (unread === 0) {
    return 'Nessuna notifica da leggere.'
  }
  if (unread === 1) {
    return '1 notifica da leggere.'
  }
  return `${unread} notifiche da leggere.`
}

function NotificationsSkeleton() {
  return (
    <ul className="grid gap-3" aria-label="Caricamento notifiche…">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex gap-4 rounded-xl border p-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Notifiche dell'utente, dalla piu' recente; le nuove arrivano anche in tempo reale (RealtimeProvider). */
export function NotificationsPage() {
  const filters = useUrlFilters(NO_FILTERS)
  const notifications = useNotifications(filters.page)
  const unreadCount = useUnreadCount()
  const markRead = useMarkRead()

  function mark(ids: readonly string[]) {
    markRead.mutate(ids, { onError: showError })
  }

  function unreadIds(items: readonly NotificationResponse[]): string[] {
    return items.filter((item) => item.readAt === null).map((item) => item.id)
  }

  // Il backend segna una notifica alla volta: "tutte" sono quelle non lette di questa pagina.
  const visibleUnread = unreadIds(notifications.data?.content ?? [])

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 pb-16">
      <title>Notifiche · Eventi</title>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Notifiche</h1>
          {unreadCount.data !== undefined && (
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {unreadLabel(unreadCount.data.unread)}
            </p>
          )}
        </div>
        {visibleUnread.length > 0 && (
          <Button variant="outline" onClick={() => mark(visibleUnread)} disabled={markRead.isPending}>
            <ChecksIcon data-icon="inline-start" aria-hidden="true" />
            Segna tutte come lette
          </Button>
        )}
      </header>
      <QueryState
        query={notifications}
        loading={<NotificationsSkeleton />}
        isEmpty={(data) => data.content.length === 0}
        empty={
          <EmptyState
            icon={<BellSlashIcon />}
            title="Nessuna notifica"
            description="Qui trovi gli avvisi sugli eventi a cui sei iscritto, i nuovi partecipanti ai tuoi eventi e le richieste di amicizia."
          />
        }
      >
        {(data) => (
          <>
            <ul className="grid gap-3">
              {data.content.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={(id) => mark([id])}
                  isMarking={markRead.isPending}
                />
              ))}
            </ul>
            <Pagination
              page={data.page}
              onPageChange={(page) => {
                filters.setPage(page)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </>
        )}
      </QueryState>
    </div>
  )
}
