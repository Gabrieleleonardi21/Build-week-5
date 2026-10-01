import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventKeys } from '@/features/events/api'
import { getMyTicket, getMyTickets, getParticipants, joinEvent, leaveEvent, ticketKeys } from '../api'

/** Il mio ticket per un evento (null = non iscritto). enabled=false per anonimi e organizzatore. */
export function useMyTicket(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: ticketKeys.mine(eventId),
    queryFn: ({ signal }) => getMyTicket(eventId, signal),
    enabled,
  })
}

export function useMyTickets(page: number, size: number) {
  return useQuery({
    queryKey: ticketKeys.list(page),
    queryFn: ({ signal }) => getMyTickets(page, size, signal),
    placeholderData: keepPreviousData,
  })
}

export function useParticipants(eventId: string, page: number, size: number) {
  return useQuery({
    queryKey: ticketKeys.participants(eventId, page),
    queryFn: ({ signal }) => getParticipants(eventId, page, size, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Iscrizione e annullamento. Dopo entrambe cambiano: il contatore nel dettaglio evento,
 * il mio ticket, l'elenco dei miei ticket e i partecipanti (che ora posso o non posso piu' vedere).
 */
export function useJoinEvent(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => joinEvent(eventId),
    onSuccess: (ticket) => {
      // Il ticket appena emesso si mostra subito, senza aspettare la rilettura.
      queryClient.setQueryData(ticketKeys.mine(eventId), ticket)
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all })
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
    // 409 "gia' iscritto" (es. da un'altra scheda) o "al completo": si rilegge lo stato vero,
    // anche il contatore dell'evento, cosi' il bottone passa a "posti esauriti".
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.mine(eventId) })
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}

export function useLeaveEvent(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => leaveEvent(eventId),
    onSuccess: () => {
      queryClient.setQueryData(ticketKeys.mine(eventId), null)
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all })
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}
