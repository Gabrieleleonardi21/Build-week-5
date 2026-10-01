import { api } from '@/lib/api'
import { toQuery } from '@/lib/query'
import type { ChatMessageResponse, ChatSummaryResponse, FriendResponse, Page, UserSummaryResponse } from '@/lib/types'

// Chiavi della cache delle chat: le usa anche il tempo reale (messaggio arrivato -> storico e inbox).
export const chatKeys = {
  all: ['chats'] as const,
  inboxes: () => [...chatKeys.all, 'inbox'] as const,
  inbox: (page: number) => [...chatKeys.inboxes(), page] as const,
  messages: (chatId: string) => [...chatKeys.all, 'messages', chatId] as const,
  peer: (chatId: string) => [...chatKeys.all, 'peer', chatId] as const,
}

// Massimo consentito dal backend: basta per trovare l'interlocutore senza altre chiamate.
const LOOKUP_SIZE = 50

/** Conversazioni con almeno un messaggio, dalla piu' recente (GET /api/chats). */
export function getInbox(page: number, signal?: AbortSignal, size?: number): Promise<Page<ChatSummaryResponse>> {
  return api<Page<ChatSummaryResponse>>(`/api/chats${toQuery({ page, size })}`, { signal })
}

/** Storico dal messaggio piu' recente; chatId = id dell'amicizia. */
export function getMessages(chatId: string, page: number, signal?: AbortSignal): Promise<Page<ChatMessageResponse>> {
  return api<Page<ChatMessageResponse>>(`/api/chats/${encodeURIComponent(chatId)}/messages${toQuery({ page })}`, { signal })
}

/** Segna come letti i messaggi ricevuti in questa chat. */
export function markChatRead(chatId: string): Promise<void> {
  return api<void>(`/api/chats/${encodeURIComponent(chatId)}/read`, { method: 'PATCH' })
}

export interface ChatPeer {
  user: UserSummaryResponse
  /** false se l'amicizia e' stata tolta o l'altro account non e' attivo: si legge ma non si scrive. */
  canWrite: boolean
}

/**
 * Con chi si sta parlando. Lo storico non lo dice (ha solo senderId), quindi si cerca tra gli amici
 * (chat nuova, ancora senza messaggi) e poi nell'inbox (ex amici: storico leggibile, canWrite false).
 */
export async function getChatPeer(chatId: string, signal?: AbortSignal): Promise<ChatPeer | null> {
  const friends = await api<Page<FriendResponse>>(`/api/friendships${toQuery({ size: LOOKUP_SIZE })}`, { signal })
  const friend = friends.content.find((item) => item.friendshipId === chatId)
  if (friend !== undefined) {
    return { user: friend.friend, canWrite: true }
  }
  const inbox = await getInbox(0, signal, LOOKUP_SIZE)
  const chat = inbox.content.find((item) => item.chatId === chatId)
  if (chat !== undefined) {
    return { user: chat.user, canWrite: chat.canWrite }
  }
  return null
}
