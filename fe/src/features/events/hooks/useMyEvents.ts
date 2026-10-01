import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getMyEvents, myEventKeys, type MyEventsParams } from '../manage-api'

/** Eventi creati dall'utente loggato; cambiando pagina la lista vecchia resta finche' arriva la nuova. */
export function useMyEvents(params: MyEventsParams) {
  return useQuery({
    queryKey: myEventKeys.list(params),
    queryFn: ({ signal }) => getMyEvents(params, signal),
    placeholderData: keepPreviousData,
  })
}
