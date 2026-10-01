import { Skeleton } from '@/components/ui/skeleton'

/** Scheletro con la forma delle righe utente (avatar + due righe di testo). */
export function RowsSkeleton({ label }: { label: string }) {
  return (
    <ul className="grid gap-3" aria-label={label}>
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="flex items-center gap-3 rounded-xl border p-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Classi della riga: su mobile le azioni vanno a capo sotto il nome. */
export const ROW_CLASS = 'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3'
