import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'

interface QueryStateProps<T> {
  query: Pick<UseQueryResult<T>, 'data' | 'isPending' | 'isError' | 'error' | 'refetch'>
  /** Scheletro con la stessa forma del contenuto finale (niente spinner generici). */
  loading: ReactNode
  /** Se restituisce true si mostra empty al posto del contenuto. */
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  children: (data: T) => ReactNode
}

/** I tre stati di ogni lista o dettaglio: caricamento, errore con Riprova, vuoto; poi il contenuto. */
export function QueryState<T>({ query, loading, isEmpty, empty, children }: QueryStateProps<T>) {
  if (query.isPending) {
    return <>{loading}</>
  }
  if (query.isError) {
    return (
      <div role="alert" className="grid justify-items-center gap-3 rounded-xl border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{errorMessage(query.error)}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Riprova
        </Button>
      </div>
    )
  }
  const data = query.data as T
  if (isEmpty !== undefined && empty !== undefined && isEmpty(data)) {
    return <>{empty}</>
  }
  return <>{children(data)}</>
}
