import type { QueryClient } from '@tanstack/react-query'
import { authKeys } from '@/features/auth/api'
import { eventKeys } from '@/features/events/api'
import { profileKeys } from '@/features/profile/api'
import { uploadManager } from '@/lib/upload-manager'

/** Quando un'immagine e' caricata si aggiornano le pagine che la mostrano. */
export function connectUploadsToCache(queryClient: QueryClient): void {
  uploadManager.setCompleteHandler((target) => {
    if (target.kind === 'avatar') {
      void queryClient.invalidateQueries({ queryKey: authKeys.me })
      void queryClient.invalidateQueries({ queryKey: profileKeys.me })
      return
    }
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(target.eventId) })
    if (target.kind === 'event-image') {
      // La prima foto e' la copertina delle card: anche le liste vanno ricaricate.
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
    }
  })
}
