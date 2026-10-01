import { ArrowLeftIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-context'
import { QueryState } from '@/components/feedback/QueryState'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/errors'
import { hasRole } from '@/lib/roles'
import type { ArtistResponse } from '@/lib/types'
import { artistKeys, deleteArtist } from '../api'
import { ArtistFormDialog } from '../components/ArtistFormDialog'
import { ArtistImage } from '../components/ArtistImage'
import { useArtist } from '../hooks/useArtist'

const LAYOUT = 'grid gap-8 md:grid-cols-[18rem_1fr] md:items-start'

function DetailSkeleton() {
  return (
    <div className={LAYOUT} aria-label="Caricamento artista…">
      <Skeleton className="aspect-square w-full max-w-72 rounded-2xl" />
      <div className="grid gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

function ArtistNotFound() {
  return (
    <div className="grid justify-items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-balance">Artista non trovato</h1>
      <p className="text-muted-foreground">Potrebbe essere stato rimosso da un moderatore.</p>
      <Button asChild>
        <Link to="/artists">Vedi tutti gli artisti</Link>
      </Button>
    </div>
  )
}

/** Modifica e cancellazione: solo MODERATOR (il backend risponde 403 agli altri). */
function ModeratorActions({ artist }: { artist: ArtistResponse }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  async function handleDelete() {
    try {
      await deleteArtist(artist.id)
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        // Cancellarlo lo toglierebbe in silenzio dagli eventi di altri utenti.
        throw new Error(`${artist.name} è nella scaletta di almeno un evento: non si può cancellare, ma puoi modificarlo.`, { cause: error })
      }
      throw error
    }
    queryClient.removeQueries({ queryKey: artistKeys.detail(artist.id) })
    void queryClient.invalidateQueries({ queryKey: artistKeys.lists() })
    toast.success(`${artist.name} cancellato`)
    navigate('/artists', { replace: true })
  }

  return (
    <div className="flex flex-wrap gap-2 border-t pt-6">
      <ArtistFormDialog
        artist={artist}
        trigger={
          <Button variant="outline">
            <PencilSimpleIcon data-icon="inline-start" aria-hidden="true" />
            Modifica
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="outline">
            <TrashIcon data-icon="inline-start" aria-hidden="true" />
            Cancella
          </Button>
        }
        title={`Cancellare ${artist.name}?`}
        description="L'artista sparisce dall'elenco. Non si può annullare."
        confirmLabel="Cancella artista"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

interface ArtistDetailProps {
  artist: ArtistResponse
  canModerate: boolean
}

function ArtistDetail({ artist, canModerate }: ArtistDetailProps) {
  // La bio la scrivono gli utenti: mostrata come testo (a capo compresi), mai come HTML.
  let bio = <p className="text-muted-foreground">Nessuna biografia disponibile.</p>
  if (artist.bio !== null) {
    bio = <p className="max-w-prose whitespace-pre-line text-muted-foreground">{artist.bio}</p>
  }
  return (
    <article className={LAYOUT}>
      <title>{`${artist.name} · Tourevents`}</title>
      <ArtistImage imageUrl={artist.imageUrl} alt={`Foto di ${artist.name}`} size={600} loading="eager" className="max-w-72 rounded-2xl" />
      <div className="grid min-w-0 gap-6">
        <header className="grid justify-items-start gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{artist.name}</h1>
          {artist.genre !== null && <Badge variant="secondary">{artist.genre}</Badge>}
        </header>
        <section aria-labelledby="bio-title" className="grid gap-3">
          <h2 id="bio-title" className="text-xl font-semibold">
            Biografia
          </h2>
          {bio}
        </section>
        {canModerate && <ModeratorActions artist={artist} />}
      </div>
    </article>
  )
}

/** Dettaglio artista: ci si arriva dall'elenco e dalla scaletta di un evento (/artists/:id). */
export function ArtistDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const artist = useArtist(id)

  let content = (
    <QueryState query={artist} loading={<DetailSkeleton />}>
      {(data) => <ArtistDetail artist={data} canModerate={hasRole(user, 'MODERATOR')} />}
    </QueryState>
  )
  if (artist.error instanceof ApiError && artist.error.status === 404) {
    content = <ArtistNotFound />
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 pb-16">
      <Button asChild variant="ghost" className="w-fit">
        <Link to="/artists">
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Tutti gli artisti
        </Link>
      </Button>
      {content}
    </div>
  )
}
