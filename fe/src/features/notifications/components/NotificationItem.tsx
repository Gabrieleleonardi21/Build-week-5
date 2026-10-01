import {
  CalendarXIcon,
  CheckIcon,
  HandshakeIcon,
  MegaphoneIcon,
  PencilSimpleIcon,
  UserPlusIcon,
  UsersIcon,
  type Icon,
} from '@phosphor-icons/react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { NotificationResponse, NotificationType } from '@/lib/types'
import { cn } from '@/lib/utils'

const ICONS: Readonly<Record<NotificationType, Icon>> = {
  EVENT_UPDATED: PencilSimpleIcon,
  EVENT_CANCELLED: CalendarXIcon,
  OWNER_MESSAGE: MegaphoneIcon,
  NEW_PARTICIPANT: UserPlusIcon,
  FRIEND_REQUEST: UsersIcon,
  FRIEND_ACCEPTED: HandshakeIcon,
}

interface NotificationLink {
  to: string
  label: string
}

/** Dove porta la notifica: l'evento a cui si riferisce, oppure gli amici per richieste e conferme. */
function linkFor(notification: NotificationResponse): NotificationLink | null {
  if (notification.eventId !== null) {
    return { to: `/events/${notification.eventId}`, label: "Vai all'evento" }
  }
  if (notification.type === 'FRIEND_REQUEST') {
    return { to: '/friends?tab=ricevute', label: 'Vedi la richiesta' }
  }
  if (notification.type === 'FRIEND_ACCEPTED') {
    return { to: '/friends', label: 'Vai agli amici' }
  }
  return null
}

interface NotificationItemProps {
  notification: NotificationResponse
  onRead: (id: string) => void
  isMarking: boolean
}

/** Una notifica: le non lette hanno il pallino e lo sfondo, e si segnano come lette anche aprendo il link. */
export function NotificationItem({ notification, onRead, isMarking }: NotificationItemProps) {
  const TypeIcon = ICONS[notification.type]
  const isUnread = notification.readAt === null
  const link = linkFor(notification)

  function markIfUnread() {
    if (isUnread) {
      onRead(notification.id)
    }
  }

  return (
    <li className={cn('flex gap-4 rounded-xl border p-4', isUnread && 'border-primary/30 bg-primary/5')}>
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
        <TypeIcon />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="flex items-center gap-2 font-medium">
          {isUnread && (
            <span className="size-2 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Non letta:</span>
            </span>
          )}
          <span className="min-w-0 break-words">{notification.title}</span>
        </p>
        {/* Testo scritto da altri utenti (es. messaggio dell'organizzatore): solo testo, mai HTML. */}
        <p className="text-sm break-words whitespace-pre-line text-muted-foreground">{notification.body}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm">
          <time dateTime={notification.createdAt} title={formatDateTime(notification.createdAt)} className="text-xs text-muted-foreground">
            {formatRelative(notification.createdAt)}
          </time>
          {link !== null && (
            <Link
              to={link.to}
              onClick={markIfUnread}
              className="rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {link.label}
            </Link>
          )}
        </div>
      </div>
      {isUnread && (
        <Button
          variant="ghost"
          size="icon-lg"
          className="shrink-0 pointer-coarse:size-11"
          onClick={markIfUnread}
          disabled={isMarking}
          aria-label={`Segna come letta: ${notification.title}`}
          title="Segna come letta"
        >
          <CheckIcon aria-hidden="true" />
        </Button>
      )}
    </li>
  )
}
