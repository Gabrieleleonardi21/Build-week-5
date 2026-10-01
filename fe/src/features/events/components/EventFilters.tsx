import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface EventFilterValues {
  q: string
  city: string
}

interface EventFiltersProps {
  values: EventFilterValues
  onSearch: (values: EventFilterValues) => void
  onClear: () => void
}

/**
 * Ricerca per testo e citta'. Campi non controllati: si cerca all'invio (Invio o "Cerca"),
 * non a ogni tasto, cosi' non parte una richiesta per lettera.
 */
export function EventFilters({ values, onSearch, onClear }: EventFiltersProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSearch({ q: String(data.get('q') ?? ''), city: String(data.get('city') ?? '') })
  }

  const hasFilters = values.q !== '' || values.city !== ''
  return (
    // key: se l'URL cambia (Indietro, "Cancella filtri") i campi ripartono dai valori dell'URL.
    <form
      key={`${values.q}|${values.city}`}
      role="search"
      aria-label="Cerca eventi"
      onSubmit={handleSubmit}
      className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
    >
      <div className="grid gap-2">
        <Label htmlFor="search-q">Cosa cerchi</Label>
        <Input
          id="search-q"
          name="q"
          type="search"
          defaultValue={values.q}
          placeholder="Jazz, festival, nome dell'artista…"
          autoComplete="off"
          maxLength={100}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="search-city">Città</Label>
        <Input
          id="search-city"
          name="city"
          defaultValue={values.city}
          placeholder="Milano…"
          autoComplete="address-level2"
          maxLength={100}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">
          <MagnifyingGlassIcon data-icon="inline-start" aria-hidden="true" />
          Cerca
        </Button>
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Cancella filtri
          </Button>
        )}
      </div>
    </form>
  )
}
