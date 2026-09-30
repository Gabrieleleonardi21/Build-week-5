import { useQuery } from '@tanstack/react-query'
import { eventKeys, getEvent } from '../api'

/** Dettaglio di un evento; si aggiorna da solo quando finisce un upload di foto o locandine. */
export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: ({ signal }) => getEvent(id, signal),
  })
}
