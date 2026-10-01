import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type { ArtistRequest, ArtistResponse, Page } from '@/lib/types'

export interface ArtistSearchParams {
  q: string
  /** Pagina da 0, come il backend. */
  page: number
  size?: number
}

// Chiavi della cache degli artisti (stesso schema di eventKeys).
export const artistKeys = {
  all: ['artists'] as const,
  lists: () => [...artistKeys.all, 'list'] as const,
  list: (params: ArtistSearchParams) => [...artistKeys.lists(), params] as const,
  detail: (id: string) => [...artistKeys.all, 'detail', id] as const,
}

/** Artisti in ordine alfabetico, filtrati per nome (GET /api/artists, pubblico). */
export function searchArtists(params: ArtistSearchParams, signal?: AbortSignal): Promise<Page<ArtistResponse>> {
  const query = toQuery({ q: params.q, page: params.page, size: params.size })
  return api<Page<ArtistResponse>>(`/api/artists${query}`, { signal })
}

export function getArtist(id: string, signal?: AbortSignal): Promise<ArtistResponse> {
  return api<ArtistResponse>(`/api/artists/${encodeURIComponent(id)}`, { signal })
}

/** Qualsiasi utente loggato; 409 se esiste gia' un artista con quel nome (senza distinguere maiuscole). */
export function createArtist(body: ArtistRequest): Promise<ArtistResponse> {
  return api<ArtistResponse>('/api/artists', { method: 'POST', body })
}

/** Solo MODERATOR: un artista e' condiviso tra gli eventi di utenti diversi (D07). */
export function updateArtist(id: string, body: ArtistRequest): Promise<ArtistResponse> {
  return api<ArtistResponse>(`/api/artists/${encodeURIComponent(id)}`, { method: 'PUT', body })
}

/** Solo MODERATOR; 409 se l'artista e' nella scaletta di almeno un evento. */
export function deleteArtist(id: string): Promise<void> {
  return api<void>(`/api/artists/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
