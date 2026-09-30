import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { eventKeys, getEventPins, type EventPinParams } from '../api'

/** Pin della mappa; cambiando filtro i pin vecchi restano finche' arrivano i nuovi. */
export function useEventPins(params: EventPinParams) {
  return useQuery({
    queryKey: eventKeys.pins(params),
    queryFn: ({ signal }) => getEventPins(params, signal),
    placeholderData: keepPreviousData,
  })
}
