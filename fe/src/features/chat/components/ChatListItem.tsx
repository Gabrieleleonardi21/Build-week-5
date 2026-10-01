import { Link } from 'react-router'
import { UserAvatar } from '@/components/data/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { ChatSummaryResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatListItemProps {
  chat: ChatSummaryResponse
  /** Id dell'utente loggato: l'ultimo messaggio suo e' preceduto da "Tu:". */
  meId: string
}

function unreadLabel(unread: number): string {
  if (unread === 1) {
    return '1 messaggio non letto'
  }
  return `${unread} messaggi non letti`
}

/** Riga dell'inbox: tutta la riga e' il link alla conversazione. */
export function ChatListItem({ chat, meId }: ChatListItemProps) {
  const name = `${chat.user.firstName} ${chat.user.lastName}`
  const hasUnread = chat.unreadMessages > 0
  const last = chat.lastMessage

  let snippet = 'Nessun messaggio'
  if (last !== null) {
    snippet = last.content
    if (last.senderId === meId) {
      snippet = `Tu: ${last.content}`
    }
  }

  return (
    <li className="relative flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50">
      <UserAvatar firstName={chat.user.firstName} lastName={chat.user.lastName} avatarUrl={chat.user.avatarUrl} className="size-11" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="flex items-baseline justify-between gap-3">
          {/* Il link copre tutta la riga (after:inset-0): un solo elemento cliccabile. */}
          <Link
            to={`/chats/${chat.chatId}`}
            className="truncate rounded-sm font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {name}
          </Link>
          {last !== null && (
            <time dateTime={last.sentAt} title={formatDateTime(last.sentAt)} className="shrink-0 text-xs text-muted-foreground">
              {formatRelative(last.sentAt)}
            </time>
          )}
        </p>
        {/* Testo scritto da un altro utente: solo testo, su una riga. */}
        <p className={cn('truncate text-sm text-muted-foreground', hasUnread && 'font-medium text-foreground')}>{snippet}</p>
        {!chat.canWrite && <p className="text-xs text-muted-foreground">Solo lettura: non siete più amici o l'account non è attivo.</p>}
      </div>
      {hasUnread && (
        <Badge className="shrink-0 tabular-nums">
          <span aria-hidden="true">{chat.unreadMessages}</span>
          <span className="sr-only">{unreadLabel(chat.unreadMessages)}</span>
        </Badge>
      )}
    </li>
  )
}
