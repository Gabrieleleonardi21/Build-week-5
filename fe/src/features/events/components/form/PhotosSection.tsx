import { ImagesIcon, TrashIcon } from '@phosphor-icons/react'
import { useCallback, useState } from 'react'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUploads } from '@/hooks/useUploads'
import type { EventResponse } from '@/lib/types'
import { uploadManager, type UploadItem } from '@/lib/upload-manager'
import { useDeleteEventImage } from '../../hooks/useEventMutations'
import { FilePickerButton } from './FilePickerButton'

// Stesso limite del backend (EventImageService.MAX_IMAGES).
const MAX_IMAGES = 10

interface PhotosSectionProps {
  event: EventResponse
}

function isRunning(item: UploadItem): boolean {
  return item.status === 'queued' || item.status === 'uploading' || item.status === 'processing'
}

/**
 * Foto dell'evento: si caricano in background con l'upload manager (si puo' continuare a compilare
 * o cambiare pagina) e si tolgono subito, senza passare dal "Salva" del form.
 */
export function PhotosSection({ event }: PhotosSectionProps) {
  const eventId = event.id
  const remove = useDeleteEventImage(eventId)
  const [rejected, setRejected] = useState<readonly string[]>([])
  const mine = useCallback(
    (item: UploadItem) => item.target.kind === 'event-image' && item.target.eventId === eventId && isRunning(item),
    [eventId],
  )
  const uploading = useUploads(mine)
  const free = MAX_IMAGES - event.images.length - uploading.length

  function handleFiles(files: File[]) {
    const result = uploadManager.enqueue(
      files,
      { kind: 'event-image', eventId },
      // La prima foto e' la copertina: se l'evento non ne ha, il primo file parte da solo.
      { maxItems: free, coverFirst: event.images.length === 0 && uploading.length === 0 },
    )
    setRejected(result.rejected.map((item) => item.reason))
  }

  let uploadingText = null
  if (uploading.length === 1) {
    uploadingText = '1 foto in caricamento: puoi continuare, la trovi nel pannello in basso.'
  } else if (uploading.length > 1) {
    uploadingText = `${uploading.length} foto in caricamento: puoi continuare, le trovi nel pannello in basso.`
  }

  return (
    <div className="grid gap-4">
      {event.images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {event.images.map((image, index) => {
            const position = index + 1
            return (
              <li key={image.id} className="relative">
                <img src={image.url} alt={`Foto ${position}`} width={400} height={300} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                {index === 0 && <Badge className="absolute top-2 left-2">Copertina</Badge>}
                <ConfirmDialog
                  trigger={
                    <Button type="button" variant="secondary" size="icon" className="absolute top-2 right-2 pointer-coarse:size-11" aria-label={`Togli la foto ${position}`}>
                      <TrashIcon aria-hidden="true" />
                    </Button>
                  }
                  title="Togliere questa foto?"
                  description="La foto viene eliminata subito. Se era la copertina, lo diventa la successiva."
                  confirmLabel="Togli la foto"
                  destructive
                  onConfirm={() => remove.mutateAsync(image.id)}
                />
              </li>
            )
          })}
        </ul>
      )}
      {event.images.length === 0 && uploading.length === 0 && (
        <p className="text-sm text-muted-foreground">Ancora nessuna foto: la prima che carichi sarà la copertina.</p>
      )}
      {uploadingText !== null && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {uploadingText}
        </p>
      )}
      {rejected.length > 0 && (
        <ul role="alert" className="grid gap-1 text-sm text-destructive">
          {rejected.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FilePickerButton label="Aggiungi foto" multiple disabled={free <= 0} onFiles={handleFiles}>
          <ImagesIcon aria-hidden="true" />
          Aggiungi foto
        </FilePickerButton>
        <p className="text-xs text-muted-foreground tabular-nums">
          {event.images.length} di {MAX_IMAGES} · JPEG, PNG o WebP, massimo 5 MB l'una
        </p>
      </div>
    </div>
  )
}
