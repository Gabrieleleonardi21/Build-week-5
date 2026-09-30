/** "30 secondi", "1 minuto", "15 minuti": per i messaggi di attesa dopo un 429. */
export function formatWait(seconds: number): string {
  if (seconds < 60) {
    if (seconds === 1) {
      return '1 secondo'
    }
    return `${seconds} secondi`
  }
  const minutes = Math.ceil(seconds / 60)
  if (minutes === 1) {
    return '1 minuto'
  }
  return `${minutes} minuti`
}
