export type CookieChoice = 'accepted' | 'rejected'

const KEY = 'tourevents-cookie-consent'
/** Evento con cui il link "Cookie" del footer riapre il pop up. */
export const OPEN_COOKIE_BANNER = 'tourevents:open-cookie-banner'

/** La scelta salvata, o null se l'utente non ha ancora risposto (o lo storage e' bloccato). */
export function readCookieChoice(): CookieChoice | null {
  try {
    const value = window.localStorage.getItem(KEY)
    if (value === 'accepted' || value === 'rejected') {
      return value
    }
  } catch {
    // Storage bloccato (navigazione privata): si chiede a ogni visita.
  }
  return null
}

export function saveCookieChoice(choice: CookieChoice): void {
  try {
    window.localStorage.setItem(KEY, choice)
  } catch {
    // Se non si puo' salvare, la scelta vale solo per questa visita.
  }
}
