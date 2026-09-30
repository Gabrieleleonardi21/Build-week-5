import { useEffect, useState } from 'react'

/**
 * Secondi rimanenti fino a zero (es. attesa dopo un 429 o prima di reinviare il codice).
 * start(n) fa ripartire il conto alla rovescia.
 */
export function useCountdown(): { seconds: number; start: (seconds: number) => void } {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (seconds <= 0) {
      return undefined
    }
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  return { seconds, start: setSeconds }
}
