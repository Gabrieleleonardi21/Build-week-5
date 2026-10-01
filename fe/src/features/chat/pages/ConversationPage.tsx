import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { UserAvatar } from '@/components/data/UserAvatar'
import { QueryState } from '@/components/feedback/QueryState'
import { useRealtime } from '@/components/realtime/realtime-context'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { friendKeys } from '@/features/friends/api'
import { ApiError } from '@/lib/errors'
import { chatKeys, markChatRead, type ChatPeer } from '../api'
import { MessageComposer } from '../components/MessageComposer'
import { MessageList, type PendingMessage } from '../components/MessageList'
import { orderMessages, useChatMessages, useChatPeer } from '../hooks/useChat'

const READ_ONLY_REASON = "Non potete più scrivervi: l'amicizia è stata rimossa o l'account non è attivo. I messaggi restano leggibili."

/** Toglie il primo messaggio in attesa con quel testo: il server lo ha confermato. */
function confirmPending(pending: readonly PendingMessage[], content: string): PendingMessage[] {
  const index = pending.findIndex((item) => !item.failed && item.content === content)
  if (index === -1) {
    return [...pending]
  }
  return pending.filter((_, position) => position !== index)
}

function MessagesSkeleton() {
  return (
    <div className="grid flex-1 content-end gap-3 px-4 py-4" aria-label="Caricamento messaggi…">
      <Skeleton className="h-9 w-48 rounded-2xl" />
      <Skeleton className="h-9 w-64 justify-self-end rounded-2xl" />
      <Skeleton className="h-9 w-40 rounded-2xl" />
    </div>
  )
}

function ChatNotFound() {
  return (
    <div className="grid justify-items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-balance">Conversazione non trovata</h1>
      <p className="text-muted-foreground">Puoi scrivere solo alle persone con cui hai stretto amicizia.</p>
      <Button asChild>
        <Link to="/chats">Torna alle chat</Link>
      </Button>
    </div>
  )
}

interface ChatHeaderProps {
  peer: ChatPeer | null | undefined
}

function ChatHeader({ peer }: ChatHeaderProps) {
  let who = <h1 className="truncate font-semibold">Conversazione</h1>
  if (peer !== null && peer !== undefined) {
    const name = `${peer.user.firstName} ${peer.user.lastName}`
    who = (
      <>
        <title>{`Chat con ${name} · Eventi`}</title>
        <UserAvatar firstName={peer.user.firstName} lastName={peer.user.lastName} avatarUrl={peer.user.avatarUrl} className="size-10" />
        <h1 className="min-w-0 truncate font-semibold">
          <Link to={`/users/${peer.user.id}`} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {name}
          </Link>
        </h1>
      </>
    )
  }
  return (
    <header className="flex items-center gap-3 border-b p-3">
      <Button asChild variant="ghost" size="icon-lg" className="shrink-0 pointer-coarse:size-11">
        <Link to="/chats" aria-label="Tutte le chat" title="Tutte le chat">
          <ArrowLeftIcon aria-hidden="true" />
        </Link>
      </Button>
      {who}
    </header>
  )
}

/** Conversazione con un amico: storico via REST, messaggi nuovi e invio via STOMP (docs/API.md §8). */
export function ConversationPage() {
  const { chatId = '' } = useParams()
  // key: passando da una chat all'altra senza lasciare la pagina (toast "Apri", Indietro) bozza e
  // messaggi in attesa ripartono da zero, invece di comparire nella conversazione sbagliata.
  return <Conversation key={chatId} chatId={chatId} />
}

function Conversation({ chatId }: { chatId: string }) {
  const { user } = useAuth()
  const meId = user?.id ?? ''
  const queryClient = useQueryClient()
  const { connected, sendChatMessage, subscribeChat } = useRealtime()
  const peer = useChatPeer(chatId)
  const history = useChatMessages(chatId)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<PendingMessage[]>([])

  const messages = orderMessages(history.data?.pages ?? [])

  // La copia del proprio messaggio conferma l'invio; un errore, o il socket che cade prima della
  // conferma, lo lascia in lista come "Non inviato" (da riprovare o scartare).
  useEffect(() => {
    return subscribeChat((event) => {
      if (event.type !== 'message') {
        setPending((current) => current.map((item) => ({ ...item, failed: true })))
        return
      }
      if (event.message.friendshipId === chatId && event.message.senderId === meId) {
        setPending((current) => confirmPending(current, event.message.content))
      }
    })
  }, [subscribeChat, chatId, meId])

  // Ultimo messaggio ricevuto e non ancora letto: aprendo la chat (o quando ne arriva uno) si segna letto.
  const lastUnreadId = messages.findLast((message) => message.senderId !== meId && message.readAt === null)?.id
  useEffect(() => {
    if (lastUnreadId === undefined) {
      return
    }
    markChatRead(chatId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: chatKeys.inboxes() })
        void queryClient.invalidateQueries({ queryKey: friendKeys.all })
      })
      // Se fallisce il contatore resta com'era: si riprova al prossimo messaggio o alla prossima apertura.
      .catch(() => undefined)
  }, [chatId, lastUnreadId, queryClient])

  function send(content: string): boolean {
    if (!sendChatMessage(chatId, content)) {
      toast.error('La chat non è collegata: riprova tra un momento.')
      return false
    }
    setPending((current) => [...current, { id: crypto.randomUUID(), content, failed: false }])
    return true
  }

  function handleSend() {
    // Stesso trim del backend: la copia che torna deve coincidere con il messaggio in attesa.
    const content = draft.trim()
    if (content === '') {
      return
    }
    if (send(content)) {
      setDraft('')
    }
  }

  function discard(id: string) {
    setPending((current) => current.filter((item) => item.id !== id))
  }

  function retry(id: string) {
    const failed = pending.find((item) => item.id === id)
    if (failed === undefined) {
      return
    }
    discard(id)
    send(failed.content)
  }

  if (history.error instanceof ApiError && history.error.status === 404) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <ChatNotFound />
      </div>
    )
  }

  let readOnlyReason: string | null = null
  if (peer.data !== null && peer.data !== undefined && !peer.data.canWrite) {
    readOnlyReason = READ_ONLY_REASON
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <title>Chat · Eventi</title>
      {/* Altezza fissa sulla finestra: scorre solo lo storico, intestazione e campo restano visibili. */}
      <section aria-label="Conversazione" className="flex h-[calc(100dvh-8rem)] min-h-96 flex-col overflow-hidden rounded-2xl border bg-card">
        <ChatHeader peer={peer.data} />
        <QueryState query={history} loading={<MessagesSkeleton />}>
          {() => (
            <MessageList
              messages={messages}
              pending={pending}
              meId={meId}
              hasMore={history.hasNextPage}
              isLoadingMore={history.isFetchingNextPage}
              onLoadMore={() => void history.fetchNextPage()}
              onRetry={retry}
              onDiscard={discard}
            />
          )}
        </QueryState>
        <MessageComposer value={draft} onChange={setDraft} onSend={handleSend} connected={connected} readOnlyReason={readOnlyReason} />
      </section>
    </div>
  )
}
