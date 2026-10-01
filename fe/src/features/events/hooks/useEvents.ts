import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { eventKeys, searchEvents, type EventSearchParams } from '../api'

/**
 * Lista pubblica degli eventi. keepPreviousData: cambiando pagina o filtro la lista
 * vecchia resta visibile finche' arriva la nuova, niente salti dello skeleton.
 */
export function useEvents(params: EventSearchParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: ({ signal }) => searchEvents(params, signal),
    placeholderData: keepPreviousData,
  })
}
