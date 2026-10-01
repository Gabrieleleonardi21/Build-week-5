import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/auth-context'
import { Label } from '@/components/ui/label'
import { MIN_SEARCH_LENGTH, useUserSearch } from '../hooks/useFriends'
import { HowFriendsWork } from './HowFriendsWork'
import { RequestFriendship } from './RequestFriendship'
import { ROW_CLASS, RowsSkeleton } from './RowsSkeleton'
import { UserLine } from './UserLine'

interface UserSearchProps {
  /** Testo cercato, letto dall'URL (?q=): la ricerca si puo' condividere e ricaricare. */
  q: string
  onSearch: (q: string) => void
}

function Results({ q }: { q: string }) {
  const { user: me } = useAuth()
  const [page, setPage] = useState(0)
  const users = useUserSearch(q, page)
  return (
    <QueryState
      query={users}
      loading={<RowsSkeleton label="Ricerca in corso…" />}
      isEmpty={(data) => data.content.length === 0}
      empty={<EmptyState icon={<MagnifyingGlassIcon />} title="Nessun utente trovato" description="Controlla come l’hai scritto, oppure prova solo con il nome o solo con il cognome." />}
    >
      {(data) => (
        <>
          <ul className="grid gap-3" aria-label="Risultati della ricerca">
            {data.content.map((user) => (
              <li key={user.id} className={ROW_CLASS}>
                <UserLine user={user} />
                {/* A se stessi l'amicizia non si chiede (il backend risponderebbe 400). */}
                {me !== null && me.id !== user.id && <RequestFriendship user={user} />}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} onPageChange={setPage} />
        </>
      )}
    </QueryState>
  )
}

/** Scheda "Cerca": utenti attivi per nome e cognome. Si cerca all'invio, non a ogni tasto. */
export function UserSearch({ q, onSearch }: UserSearchProps) {
  const [tooShort, setTooShort] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    // Stesso minimo del backend: si avvisa subito, senza una chiamata che darebbe 400.
    if (value.length < MIN_SEARCH_LENGTH) {
      setTooShort(true)
      return
    }
    setTooShort(false)
    onSearch(value)
  }

  let errorId: string | undefined
  if (tooShort) {
    errorId = 'user-search-error'
  }

  return (
    <div className="grid gap-6">
      <HowFriendsWork />
      {/* key: se l'URL cambia (Indietro) il campo riparte dal valore dell'URL. */}
      <form key={q} role="search" aria-label="Cerca utenti" onSubmit={handleSubmit} className="grid gap-2">
        <Label htmlFor="user-search-q">Cerca una persona per nome o cognome</Label>
        <div className="flex gap-2">
          <Input
            id="user-search-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Sara Colombo…"
            autoComplete="off"
            maxLength={100}
            aria-invalid={tooShort}
            aria-describedby={errorId}
            className="sm:max-w-sm"
          />
          <Button type="submit">
            <MagnifyingGlassIcon data-icon="inline-start" aria-hidden="true" />
            Cerca
          </Button>
        </div>
        {tooShort && (
          <p id="user-search-error" role="alert" className="text-xs font-medium text-destructive">
            Scrivi almeno {MIN_SEARCH_LENGTH} caratteri.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Si diventa amici tra partecipanti dello stesso evento: trovata la persona, premi “Aggiungi agli amici” e scegli l’evento a cui andate insieme.
        </p>
      </form>
      {/* key: una nuova ricerca riparte dalla prima pagina. */}
      {q.length >= MIN_SEARCH_LENGTH && <Results key={q} q={q} />}
    </div>
  )
}
