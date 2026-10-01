import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ArtistSearchProps {
  value: string
  onSearch: (q: string) => void
  onClear: () => void
}

/** Ricerca per nome: campo non controllato, si cerca all'invio (non una richiesta per lettera). */
export function ArtistSearch({ value, onSearch, onClear }: ArtistSearchProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSearch(String(data.get('q') ?? ''))
  }

  return (
    // key: se l'URL cambia (Indietro, "Cancella") il campo riparte dal valore dell'URL.
    <form key={value} role="search" aria-label="Cerca artisti" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[minmax(0,24rem)_auto] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="artist-q">Nome dell'artista</Label>
        <Input id="artist-q" name="q" type="search" defaultValue={value} placeholder="Blue Trio…" autoComplete="off" maxLength={150} />
      </div>
      <div className="flex gap-2">
        <Button type="submit">
          <MagnifyingGlassIcon data-icon="inline-start" aria-hidden="true" />
          Cerca
        </Button>
        {value !== '' && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Cancella
          </Button>
        )}
      </div>
    </form>
  )
}
