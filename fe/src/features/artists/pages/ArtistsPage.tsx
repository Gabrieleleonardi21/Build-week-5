import { MicrophoneStageIcon, PlusIcon } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth/auth-context'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { ArtistFormDialog } from '../components/ArtistFormDialog'
import { ArtistGrid, ArtistGridSkeleton } from '../components/ArtistGrid'
import { ArtistSearch } from '../components/ArtistSearch'
import { useArtists } from '../hooks/useArtists'

const FILTER_KEYS = ['q'] as const
const PAGE_SIZE = 12

function resultsLabel(total: number): string {
  if (total === 1) {
    return '1 artista'
  }
  return `${total} artisti`
}

/** Elenco pubblico degli artisti con ricerca per nome (stesso schema di DiscoverPage). */
export function ArtistsPage() {
  const { user } = useAuth()
  const filters = useUrlFilters(FILTER_KEYS)
  const { q } = filters.values
  const artists = useArtists({ q, page: filters.page, size: PAGE_SIZE })

  let count = null
  if (artists.data !== undefined && artists.data.page.totalElements > 0) {
    count = (
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {resultsLabel(artists.data.page.totalElements)}
      </p>
    )
  }

  let emptyDescription = 'Gli artisti compaiono qui quando qualcuno li aggiunge alla scaletta di un evento.'
  if (q !== '') {
    emptyDescription = 'Controlla come è scritto il nome oppure cancella la ricerca.'
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 pb-16">
      <title>Artisti · Tourevents</title>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">Artisti</h1>
          <p className="max-w-prose text-muted-foreground text-pretty">Chi suona negli eventi della piattaforma.</p>
        </div>
        {/* Creare un artista richiede il login: agli anonimi il bottone non serve. */}
        {user !== null && (
          <ArtistFormDialog
            trigger={
              <Button>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                Nuovo artista
              </Button>
            }
          />
        )}
      </header>
      <ArtistSearch value={q} onSearch={(next) => filters.setFilters({ q: next })} onClear={filters.clear} />
      <section aria-label="Risultati" className="grid gap-6">
        {count}
        <QueryState
          query={artists}
          loading={<ArtistGridSkeleton />}
          isEmpty={(data) => data.content.length === 0}
          empty={<EmptyState icon={<MicrophoneStageIcon />} title="Nessun artista trovato" description={emptyDescription} />}
        >
          {(data) => (
            <>
              <ArtistGrid artists={data.content} />
              <Pagination
                page={data.page}
                onPageChange={(page) => {
                  filters.setPage(page)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </>
          )}
        </QueryState>
      </section>
    </div>
  )
}
