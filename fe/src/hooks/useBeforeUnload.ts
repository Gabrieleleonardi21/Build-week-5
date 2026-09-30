import { useEffect } from 'react'

/** Chiede conferma se si chiude o ricarica la scheda mentre active e' true (es. upload in corso). */
export function useBeforeUnload(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return undefined
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}
