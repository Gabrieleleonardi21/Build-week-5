import { BellIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications'

// Oltre questo numero il badge mostra "99+": resta leggibile nello spazio di un'icona.
const MAX_SHOWN = 99

/** Campanella dell'header con il numero di notifiche non lette (si aggiorna in tempo reale). */
export function NotificationBell() {
  const unread = useUnreadCount().data?.unread ?? 0

  let label = 'Notifiche'
  let badge = null
  if (unread > 0) {
    let text = String(unread)
    if (unread > MAX_SHOWN) {
      text = `${MAX_SHOWN}+`
    }
    label = `Notifiche, ${unread} non lette`
    if (unread === 1) {
      label = 'Notifiche, 1 non letta'
    }
    badge = (
      <span
        className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground tabular-nums"
        aria-hidden="true"
      >
        {text}
      </span>
    )
  }

  return (
    <Button asChild variant="ghost" size="icon-lg" className="relative pointer-coarse:size-11">
      <Link to="/notifications" aria-label={label} title={label}>
        <BellIcon aria-hidden="true" />
        {badge}
      </Link>
    </Button>
  )
}
