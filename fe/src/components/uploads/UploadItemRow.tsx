import { ArrowClockwiseIcon, CheckCircleIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { UploadItem } from '@/lib/upload-manager'

interface UploadItemRowProps {
  item: UploadItem
  onRetry: (id: string) => void
  onCancel: (id: string) => void
  onDismiss: (id: string) => void
}

function statusText(item: UploadItem): string {
  if (item.status === 'queued') {
    return 'In attesa'
  }
  if (item.status === 'uploading') {
    return `Invio ${item.progress}%`
  }
  if (item.status === 'processing') {
    return 'Elaborazione…'
  }
  if (item.status === 'done') {
    return 'Caricata'
  }
  if (item.status === 'canceled') {
    return 'Annullato'
  }
  return item.error ?? 'Non riuscito'
}

/** Una riga del pannello upload: anteprima, stato, barra e azioni. */
export function UploadItemRow({ item, onRetry, onCancel, onDismiss }: UploadItemRowProps) {
  const isRunning = item.status === 'queued' || item.status === 'uploading' || item.status === 'processing'
  const canRetry = item.status === 'error' || item.status === 'canceled'
  const text = statusText(item)

  // Mentre il server carica su Cloudinary la percentuale non esiste: barra piena e animata.
  let bar = null
  if (item.status === 'uploading') {
    bar = <Progress value={item.progress} aria-label={`Invio di ${item.label}`} />
  } else if (item.status === 'processing') {
    bar = <Progress value={100} className="animate-pulse" aria-label={`Elaborazione di ${item.label}`} />
  }

  let icon = null
  if (item.status === 'done') {
    icon = <CheckCircleIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
  } else if (item.status === 'error') {
    icon = <WarningCircleIcon className="size-4 shrink-0 text-destructive" aria-hidden="true" />
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <img src={item.previewUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" width={40} height={40} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium">{item.label}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{text}</span>
        </p>
        {bar}
      </div>
      {canRetry && (
        <Button variant="ghost" size="icon" onClick={() => onRetry(item.id)} aria-label={`Riprova ${item.label}`}>
          <ArrowClockwiseIcon />
        </Button>
      )}
      {isRunning && (
        <Button variant="ghost" size="icon" onClick={() => onCancel(item.id)} aria-label={`Annulla ${item.label}`}>
          <XIcon />
        </Button>
      )}
      {!isRunning && (
        <Button variant="ghost" size="icon" onClick={() => onDismiss(item.id)} aria-label={`Chiudi ${item.label}`}>
          <XIcon />
        </Button>
      )}
    </li>
  )
}
