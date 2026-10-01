import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { EventStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: EventStatus
  /** Data di fine (o di inizio) per segnare gli eventi gia' conclusi. */
  endsAt?: string | null
}

/** Etichetta di stato dell'evento: nulla se e' pubblicato e ancora da venire. */
export function StatusBadge({ status, endsAt }: StatusBadgeProps) {
  // L'ora si legge una volta al montaggio: il render resta puro e non cambia a ogni aggiornamento.
  const [now] = useState(Date.now)
  if (status === 'CANCELLED') {
    return <Badge variant="destructive">Annullato</Badge>
  }
  if (endsAt !== undefined && endsAt !== null && new Date(endsAt).getTime() < now) {
    return <Badge variant="secondary">Concluso</Badge>
  }
  return null
}
