// Date sempre nel fuso dell'evento (Italia), qualunque sia il fuso del browser.
const TIME_ZONE = 'Europe/Rome'
const LOCALE = 'it-IT'

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const dateFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })
const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

/** "sab 14 giu 2027, 21:00" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** "14 giugno 2027" */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

/** "21:00 - 22:30", "21:00", oppure "" se l'orario non c'e'. */
export function formatTimeRange(start: string | null, end: string | null): string {
  if (start === null) {
    return ''
  }
  if (end === null) {
    return timeFormat.format(new Date(start))
  }
  return `${timeFormat.format(new Date(start))} - ${timeFormat.format(new Date(end))}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** ISO -> valore per <input type="datetime-local"> nell'ora locale del browser. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Valore di <input type="datetime-local"> -> ISO con fuso (quello che si aspetta il backend). */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

const UNITS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 31_536_000 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'minute', seconds: 60 },
]

/** "3 minuti fa", "ieri": per notifiche e chat. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSeconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000)
  for (const { unit, seconds } of UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return relativeFormat.format(Math.round(diffSeconds / seconds), unit)
    }
  }
  return 'adesso'
}
