import { ImageIcon, TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Button } from '@/components/ui/button'
import type { EventResponse, LineupEntryResponse } from '@/lib/types'
import { uploadManager } from '@/lib/upload-manager'
import { useDeletePoster } from '../../hooks/useEventMutations'
import { FilePickerButton } from './FilePickerButton'

interface PostersSectionProps {
  event: EventResponse
}

interface PosterRowProps {
  eventId: string
  entry: LineupEntryResponse
}

function PosterRow({ eventId, entry }: PosterRowProps) {
  const remove = useDeletePoster(eventId)
  const [rejected, setRejected] = useState<string>()

  function handleFiles(files: File[]) {
    const result = uploadManager.enqueue(files, { kind: 'poster', eventId, artistId: entry.artistId })
    setRejected(result.rejected[0]?.reason)
  }

  let preview = (
    <div className="grid h-16 w-12 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground" aria-hidden="true">
      <ImageIcon />
    </div>
  )
  let pickLabel = 'Carica'
  if (entry.posterUrl !== null) {
    preview = <img src={entry.posterUrl} alt={`Locandina di ${entry.artistName}`} width={48} height={64} loading="lazy" className="h-16 w-12 shrink-0 rounded-md object-cover" />
    pickLabel = 'Sostituisci'
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
      {preview}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entry.artistName}</p>
        {rejected !== undefined && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {rejected}
          </p>
        )}
      </div>
      <FilePickerButton label={`${pickLabel} la locandina di ${entry.artistName}`} onFiles={handleFiles}>
        {pickLabel}
      </FilePickerButton>
      {entry.posterUrl !== null && (
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" size="icon" className="pointer-coarse:size-11" aria-label={`Togli la locandina di ${entry.artistName}`}>
              <TrashIcon aria-hidden="true" />
            </Button>
          }
          title="Togliere la locandina?"
          description={`La locandina di ${entry.artistName} viene eliminata subito.`}
          confirmLabel="Togli la locandina"
          destructive
          onConfirm={() => remove.mutateAsync(entry.artistId)}
        />
      )}
    </li>
  )
}

/**
 * Locandine degli artisti gia' salvati in scaletta: la locandina e' legata alla riga salvata
 * (evento + artista), quindi per un artista appena aggiunto nel form serve prima "Salva".
 */
export function PostersSection({ event }: PostersSectionProps) {
  if (event.lineup.length === 0) {
    return <p className="text-sm text-muted-foreground">Aggiungi gli artisti in scaletta e salva: poi qui potrai caricare le loro locandine.</p>
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {event.lineup.map((entry) => (
        <PosterRow key={entry.artistId} eventId={event.id} entry={entry} />
      ))}
    </ul>
  )
}
