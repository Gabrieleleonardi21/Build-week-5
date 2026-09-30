import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export interface UrlFilters<K extends string> {
  values: Readonly<Record<K, string>>
  /** Pagina da 0 (nell'URL e' da 1, piu' leggibile: ?page=2 = seconda pagina). */
  page: number
  /** Cambia i filtri e torna alla prima pagina. */
  setFilters: (next: Partial<Record<K, string>>) => void
  setPage: (page: number) => void
  clear: () => void
}

function readPage(raw: string | null): number {
  const page = Number.parseInt(raw ?? '', 10)
  if (Number.isNaN(page) || page < 1) {
    return 0
  }
  return page - 1
}

/**
 * Filtri e paginazione di una lista salvati nell'URL: si possono condividere, ricaricare
 * e tornano giusti col tasto Indietro (web-design-guidelines: "URL reflects state").
 */
export function useUrlFilters<K extends string>(keys: readonly K[]): UrlFilters<K> {
  const [searchParams, setSearchParams] = useSearchParams()

  const values = useMemo(() => {
    const result = {} as Record<K, string>
    for (const key of keys) {
      result[key] = searchParams.get(key) ?? ''
    }
    return result
  }, [keys, searchParams])

  const page = readPage(searchParams.get('page'))

  const setFilters = useCallback(
    (next: Partial<Record<K, string>>) => {
      setSearchParams((current) => {
        const updated = new URLSearchParams(current)
        for (const [key, value] of Object.entries(next) as Array<[K, string | undefined]>) {
          const trimmed = (value ?? '').trim()
          if (trimmed === '') {
            updated.delete(key)
          } else {
            updated.set(key, trimmed)
          }
        }
        updated.delete('page')
        return updated
      })
    },
    [setSearchParams],
  )

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams((current) => {
        const updated = new URLSearchParams(current)
        if (nextPage <= 0) {
          updated.delete('page')
        } else {
          updated.set('page', String(nextPage + 1))
        }
        return updated
      })
    },
    [setSearchParams],
  )

  const clear = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams])

  return { values, page, setFilters, setPage, clear }
}
