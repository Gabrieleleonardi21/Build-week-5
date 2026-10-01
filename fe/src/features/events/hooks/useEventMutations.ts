import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketKeys } from '@/features/tickets/api'
import type { EventRequest } from '@/lib/types'
import { createEvent, deleteEventImage, deletePoster, eventKeys, proposeDescription, updateEvent } from '../api'

/**
 * Crea (id undefined) o modifica un evento. Dopo il salvataggio il dettaglio in cache e' la risposta
 * del server e tutte le liste di eventi (home, mappa, i miei eventi) si ricaricano.
 */
export function useSaveEvent(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EventRequest) => {
      if (id === undefined) {
        return createEvent(body)
      }
      return updateEvent(id, body)
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all })
      // I ticket portano con se' titolo, data e luogo dell'evento: anche "I miei ticket" va riletto.
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all })
      // Dopo l'invalidazione: il dettaglio resta quello appena salvato finche' non arriva il refetch.
      queryClient.setQueryData(eventKeys.detail(saved.id), saved)
    },
  })
}

/** Toglie una foto; cambia anche la copertina delle card, quindi si ricaricano pure le liste. */
export function useDeleteEventImage(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: string) => deleteEventImage(eventId, imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    },
  })
}

export function useDeletePoster(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (artistId: string) => deletePoster(eventId, artistId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
  })
}

/** Proposta dell'AI: non tocca la cache, il testo si salva solo con il form. */
export function useAiProposal(eventId: string) {
  return useMutation({ mutationFn: (text: string) => proposeDescription(eventId, text) })
}
