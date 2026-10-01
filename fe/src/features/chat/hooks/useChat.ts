import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { ChatMessageResponse, Page } from '@/lib/types'
import { chatKeys, getChatPeer, getInbox, getMessages } from '../api'

/** Inbox paginata; cambiando pagina la lista vecchia resta finche' arriva la nuova. */
export function useInbox(page: number) {
  return useQuery({
    queryKey: chatKeys.inbox(page),
    queryFn: ({ signal }) => getInbox(page, signal),
    placeholderData: keepPreviousData,
  })
}

/** Con chi si sta parlando e se si puo' ancora scrivere. */
export function useChatPeer(chatId: string) {
  return useQuery({
    queryKey: chatKeys.peer(chatId),
    queryFn: ({ signal }) => getChatPeer(chatId, signal),
  })
}

/**
 * Storico a pagine dal piu' recente: la prima pagina sono gli ultimi messaggi, le successive
 * si caricano con "Messaggi precedenti". I messaggi nuovi li aggiunge il tempo reale (applyChatMessage).
 */
export function useChatMessages(chatId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(chatId),
    queryFn: ({ pageParam, signal }) => getMessages(chatId, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page.number + 1
      if (next >= lastPage.page.totalPages) {
        return undefined
      }
      return next
    },
  })
}

/**
 * Dalle pagine (dal piu' recente) alla lista in ordine di lettura (dal piu' vecchio), senza doppioni:
 * un messaggio arrivato in tempo reale sposta di uno le pagine successive, che lo ripetono.
 */
export function orderMessages(pages: ReadonlyArray<Page<ChatMessageResponse>>): ChatMessageResponse[] {
  const byId = new Map<string, ChatMessageResponse>()
  for (const page of pages) {
    for (const message of page.content) {
      byId.set(message.id, message)
    }
  }
  return [...byId.values()].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
}
