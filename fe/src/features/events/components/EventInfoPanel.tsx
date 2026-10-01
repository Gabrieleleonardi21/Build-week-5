import { CalendarBlankIcon, MapPinIcon, UsersIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { UserAvatar } from '@/components/data/UserAvatar'
import { formatDateTime } from '@/lib/format'
import type { EventResponse } from '@/lib/types'

interface EventInfoPanelProps {
  event: EventResponse
  /** Spazi per le altre tracce: iscrizione (T4) e azioni del proprietario (T3). */
  actions: ReactNode
}

function capacityText(event: EventResponse): string {
  let joined = `${event.participants} iscritti`
  if (event.participants === 1) {
    joined = '1 iscritto'
  }
  if (event.maxParticipants === null) {
    return `${joined}, posti senza limite`
  }
  if (event.participants >= event.maxParticipants) {
    return `${joined}, posti esauriti`
  }
  return `${joined} su ${event.maxParticipants} posti`
}

interface RowProps {
  icon: ReactNode
  label: string
  children: ReactNode
}

function Row({ icon, label, children }: RowProps) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="grid gap-0.5 text-sm">{children}</dd>
      </div>
    </div>
  )
}

/** Riquadro laterale: quando, dove, quanti, chi organizza, e le azioni. */
export function EventInfoPanel({ event, actions }: EventInfoPanelProps) {
  let place = <span className="font-medium">{event.address}</span>
  if (event.venueName !== null) {
    place = (
      <>
        <span className="font-medium">{event.venueName}</span>
        <span className="text-muted-foreground">{event.address}</span>
      </>
    )
  }
  let province = ''
  if (event.province !== null) {
    province = ` (${event.province})`
  }

  return (
    <aside className="grid gap-6 rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
      <dl className="grid gap-4">
        <Row icon={<CalendarBlankIcon />} label="Quando">
          <time dateTime={event.startsAt} className="font-medium">
            {formatDateTime(event.startsAt)}
          </time>
          {event.endsAt !== null && (
            <span className="text-muted-foreground">
              fino a <time dateTime={event.endsAt}>{formatDateTime(event.endsAt)}</time>
            </span>
          )}
        </Row>
        <Row icon={<MapPinIcon />} label="Dove">
          {place}
          <span className="text-muted-foreground">
            {event.city}
            {province}
          </span>
        </Row>
        <Row icon={<UsersIcon />} label="Partecipanti">
          <span className="tabular-nums">{capacityText(event)}</span>
        </Row>
      </dl>
      {actions}
      <div className="flex items-center gap-3 border-t pt-4">
        <UserAvatar firstName={event.owner.firstName} lastName={event.owner.lastName} avatarUrl={event.owner.avatarUrl} className="size-10" />
        <div className="min-w-0 text-sm">
          <p className="text-muted-foreground">Organizzato da</p>
          <p className="truncate font-medium">
            {event.owner.firstName} {event.owner.lastName}
          </p>
        </div>
      </div>
    </aside>
  )
}
