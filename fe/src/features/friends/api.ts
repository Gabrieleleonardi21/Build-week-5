import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type {
  FriendRequestCreate,
  FriendRequestResponse,
  FriendResponse,
  Page,
  UserSummaryResponse,
} from '@/lib/types'

// Chiavi della cache di amicizie e utenti. friendKeys.all la invalida anche il tempo reale
// (notifiche FRIEND_REQUEST e FRIEND_ACCEPTED).
export const friendKeys = {
  all: ['friends'] as const,
  list: (page: number) => [...friendKeys.all, 'list', page] as const,
  received: (page: number) => [...friendKeys.all, 'received', page] as const,
  sent: (page: number) => [...friendKeys.all, 'sent', page] as const,
  userSearch: (q: string, page: number) => [...friendKeys.all, 'userSearch', q, page] as const,
  user: (id: string) => [...friendKeys.all, 'user', id] as const,
}

function friendshipPath(id: string): string {
  return `/api/friendships/${encodeURIComponent(id)}`
}

/** I miei amici (amicizie ACCEPTED) con i messaggi non letti di ogni chat. */
export function getFriends(page: number, size: number, signal?: AbortSignal): Promise<Page<FriendResponse>> {
  return api<Page<FriendResponse>>(`/api/friendships${toQuery({ page, size })}`, { signal })
}

export function getReceivedRequests(page: number, size: number, signal?: AbortSignal): Promise<Page<FriendRequestResponse>> {
  return api<Page<FriendRequestResponse>>(`/api/friendships/requests/received${toQuery({ page, size })}`, { signal })
}

export function getSentRequests(page: number, size: number, signal?: AbortSignal): Promise<Page<FriendRequestResponse>> {
  return api<Page<FriendRequestResponse>>(`/api/friendships/requests/sent${toQuery({ page, size })}`, { signal })
}

/** Richiesta a un altro partecipante dello stesso evento (D12): 403 se non partecipate entrambi, 409 se esiste gia'. */
export function sendFriendRequest(body: FriendRequestCreate): Promise<FriendRequestResponse> {
  return api<FriendRequestResponse>('/api/friendships', { method: 'POST', body })
}

export function acceptFriendRequest(id: string): Promise<FriendResponse> {
  return api<FriendResponse>(`${friendshipPath(id)}/accept`, { method: 'POST' })
}

export function rejectFriendRequest(id: string): Promise<void> {
  return api<void>(`${friendshipPath(id)}/reject`, { method: 'POST' })
}

/** Toglie un amico (la chat resta leggibile) oppure ritira una richiesta inviata. */
export function removeFriendship(id: string): Promise<void> {
  return api<void>(friendshipPath(id), { method: 'DELETE' })
}

/** Utenti attivi per nome e cognome: il backend vuole almeno 2 caratteri (400 altrimenti). */
export function searchUsers(q: string, page: number, size: number, signal?: AbortSignal): Promise<Page<UserSummaryResponse>> {
  return api<Page<UserSummaryResponse>>(`/api/users${toQuery({ q, page, size })}`, { signal })
}

/** Profilo pubblico: 404 se l'utente non esiste, e' disattivato o ha eliminato l'account. */
export function getUser(id: string, signal?: AbortSignal): Promise<UserSummaryResponse> {
  return api<UserSummaryResponse>(`/api/users/${encodeURIComponent(id)}`, { signal })
}
