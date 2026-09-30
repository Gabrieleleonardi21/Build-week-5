/**
 * Pagina a cui tornare dopo il login (salvata da RequireAuth in location.state.from).
 * Solo percorsi interni: "/..." ma non "//sito.com", cosi' un link non puo' portare fuori (open redirect).
 */
export function safeReturnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string') {
    if (state.from.startsWith('/') && !state.from.startsWith('//')) {
      return state.from
    }
  }
  return '/'
}

/** Email passata da un'altra pagina (es. dopo la verifica si arriva al login gia' compilato). */
export function emailFromState(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'email' in state && typeof state.email === 'string') {
    return state.email
  }
  return ''
}
