import { createContext, useContext } from 'react'
import type { ChatMessageResponse } from '@/lib/types'

/**
 * Cosa arriva sulla chat in tempo reale: un messaggio (anche la copia del proprio), un errore
 * sull'invio, oppure la caduta del socket (i messaggi non ancora confermati restano senza esito).
 */
export type ChatEvent =
  | { type: 'message'; message: ChatMessageResponse }
  | { type: 'error'; text: string }
  | { type: 'disconnected' }

export interface RealtimeContextValue {
  /** true quando il WebSocket e' collegato: solo allora si possono inviare messaggi. */
  connected: boolean
  /** false se il messaggio non e' partito (socket non collegato). */
  sendChatMessage: (friendshipId: string, content: string) => boolean
  /** Per la pagina della conversazione: conferma o errore dei messaggi inviati. Restituisce la disiscrizione. */
  subscribeChat: (listener: (event: ChatEvent) => void) => () => void
}

// Senza provider (utente anonimo, test di una pagina sola) il tempo reale e' semplicemente spento.
const DISCONNECTED: RealtimeContextValue = {
  connected: false,
  sendChatMessage: () => false,
  subscribeChat: () => () => {},
}

export const RealtimeContext = createContext<RealtimeContextValue>(DISCONNECTED)

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext)
}
