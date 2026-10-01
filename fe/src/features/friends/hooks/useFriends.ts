import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FriendRequestCreate } from '@/lib/types'
import {
  acceptFriendRequest,
  friendKeys,
  getFriends,
  getReceivedRequests,
  getSentRequests,
  getUser,
  rejectFriendRequest,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
} from '../api'

export const FRIENDS_PAGE_SIZE = 20
/** Stesso minimo del backend (UserDirectoryService.MIN_QUERY_LENGTH). */
export const MIN_SEARCH_LENGTH = 2

export function useFriends(page: number) {
  return useQuery({
    queryKey: friendKeys.list(page),
    queryFn: ({ signal }) => getFriends(page, FRIENDS_PAGE_SIZE, signal),
    placeholderData: keepPreviousData,
  })
}

export function useReceivedRequests(page: number) {
  return useQuery({
    queryKey: friendKeys.received(page),
    queryFn: ({ signal }) => getReceivedRequests(page, FRIENDS_PAGE_SIZE, signal),
    placeholderData: keepPreviousData,
  })
}

export function useSentRequests(page: number) {
  return useQuery({
    queryKey: friendKeys.sent(page),
    queryFn: ({ signal }) => getSentRequests(page, FRIENDS_PAGE_SIZE, signal),
    placeholderData: keepPreviousData,
  })
}

/** Ricerca utenti: sotto i 2 caratteri la chiamata non parte (il backend risponderebbe 400). */
export function useUserSearch(q: string, page: number) {
  return useQuery({
    queryKey: friendKeys.userSearch(q, page),
    queryFn: ({ signal }) => searchUsers(q, page, FRIENDS_PAGE_SIZE, signal),
    enabled: q.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  })
}

export function usePublicUser(id: string) {
  return useQuery({
    queryKey: friendKeys.user(id),
    queryFn: ({ signal }) => getUser(id, signal),
  })
}

/**
 * Le scritture sulle amicizie. Dopo ognuna, riuscita o no, si rileggono tutti gli elenchi:
 * una richiesta accettata esce dalle "ricevute" ed entra negli "amici", e dopo un 409
 * ("non e' piu' in attesa") la lista mostrata era vecchia.
 */
function useFriendMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: friendKeys.all }),
  })
}

export function useSendFriendRequest() {
  return useFriendMutation((body: FriendRequestCreate) => sendFriendRequest(body))
}

export function useAcceptFriendRequest() {
  return useFriendMutation((id: string) => acceptFriendRequest(id))
}

export function useRejectFriendRequest() {
  return useFriendMutation((id: string) => rejectFriendRequest(id))
}

export function useRemoveFriendship() {
  return useFriendMutation((id: string) => removeFriendship(id))
}
