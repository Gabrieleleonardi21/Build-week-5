import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { createRealtimeClient, type RealtimeClient } from '@/lib/stomp'
import type { ChatMessageResponse, NotificationResponse } from '@/lib/types'
import { applyChatMessage, applyNotification, refreshAfterReconnect } from './cache-updates'
import { RealtimeContext, type ChatEvent, type RealtimeContextValue } from './realtime-context'

interface RealtimeProviderProps {
  children: ReactNode
}

type ChatListener = (event: ChatEvent) => void

// Anteprima del messaggio nel toast: il testo completo si legge nella chat.
const PREVIEW_LENGTH = 80

function preview(content: string): string {
  if (content.length <= PREVIEW_LENGTH) {
    return content
  }
  return `${content.slice(0, PREVIEW_LENGTH)}…`
}

/** Dove porta il toast di una notifica: l'evento, oppure gli amici per richieste e conferme. */
function notificationTarget(notification: NotificationResponse): string {
  if (notification.eventId !== null) {
    return `/events/${notification.eventId}`
  }
  if (notification.type === 'FRIEND_REQUEST' || notification.type === 'FRIEND_ACCEPTED') {
    return '/friends'
  }
  return '/notifications'
}

/**
 * Collega il WebSocket STOMP finche' c'e' un utente loggato (docs/API.md §8): notifiche e messaggi
 * aggiornano la cache e compaiono come toast. Sta dentro il router (AppLayout) perche' i toast
 * portano alla pagina giusta e non devono comparire per la chat gia' aperta.
 */
export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [socketOpen, setSocketOpen] = useState(false)
  const clientRef = useRef<RealtimeClient | null>(null)
  const listenersRef = useRef(new Set<ChatListener>())

  // Percorso e navigate letti da ref: cambiare pagina non deve chiudere e riaprire il socket.
  const pathRef = useRef(location.pathname)
  const navigateRef = useRef(navigate)
  useEffect(() => {
    pathRef.current = location.pathname
    navigateRef.current = navigate
  }, [location.pathname, navigate])

  useEffect(() => {
    if (userId === null) {
      return undefined
    }
    const listeners = listenersRef.current
    const emit = (event: ChatEvent) => {
      for (const listener of listeners) {
        listener(event)
      }
    }

    const onNotification = (notification: NotificationResponse) => {
      applyNotification(queryClient, notification)
      const target = notificationTarget(notification)
      // Titolo e testo arrivano da altri utenti: sonner li mostra come testo, mai come HTML.
      toast(notification.title, {
        description: notification.body,
        action: { label: 'Apri', onClick: () => void navigateRef.current(target) },
      })
    }

    const onChatMessage = (message: ChatMessageResponse) => {
      applyChatMessage(queryClient, message)
      emit({ type: 'message', message })
      const chatPath = `/chats/${message.friendshipId}`
      // Niente toast per i propri messaggi ne' per la conversazione che si sta guardando.
      if (message.senderId !== userId && pathRef.current !== chatPath) {
        toast('Nuovo messaggio', {
          description: preview(message.content),
          action: { label: 'Apri', onClick: () => void navigateRef.current(chatPath) },
        })
      }
    }

    const onError = (text: string) => {
      emit({ type: 'error', text })
      toast.error(text)
    }

    let wasConnected = false
    const onConnectionChange = (open: boolean) => {
      // Un client gia' sostituito (cambio utente) chiude il socket in ritardo: il suo evento non conta piu'.
      if (clientRef.current !== client) {
        return
      }
      setSocketOpen(open)
      if (!open) {
        emit({ type: 'disconnected' })
        return
      }
      if (wasConnected) {
        refreshAfterReconnect(queryClient)
      }
      wasConnected = true
    }

    const client = createRealtimeClient({ onNotification, onChatMessage, onError, onConnectionChange })
    clientRef.current = client
    client.start()
    // Logout o cambio utente: il socket si chiude, quello nuovo parte con la nuova sessione.
    return () => {
      client.stop()
      clientRef.current = null
      setSocketOpen(false)
    }
  }, [userId, queryClient])

  const sendChatMessage = useCallback((friendshipId: string, content: string): boolean => {
    if (clientRef.current === null) {
      return false
    }
    return clientRef.current.sendChatMessage(friendshipId, content)
  }, [])

  const subscribeChat = useCallback((listener: ChatListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const connected = socketOpen && userId !== null
  const value = useMemo<RealtimeContextValue>(
    () => ({ connected, sendChatMessage, subscribeChat }),
    [connected, sendChatMessage, subscribeChat],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
