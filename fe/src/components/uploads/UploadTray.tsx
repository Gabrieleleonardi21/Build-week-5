import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { useUploads } from '@/hooks/useUploads'
import { uploadManager, type UploadManager } from '@/lib/upload-manager'
import { UploadItemRow } from './UploadItemRow'

interface UploadTrayProps {
  /** Iniettabile nei test; nell'app e' l'istanza unica. */
  manager?: UploadManager
}

/**
 * Pannello fisso degli upload, montato nel layout: resta visibile su ogni pagina,
 * cosi' l'utente puo' continuare a usare l'app mentre le immagini salgono.
 */
export function UploadTray({ manager = uploadManager }: UploadTrayProps) {
  const items = useUploads(undefined, manager)
  const pending = items.filter((item) => item.status !== 'done' && item.status !== 'error' && item.status !== 'canceled')
  useBeforeUnload(pending.length > 0)

  if (items.length === 0) {
    return null
  }

  let title = 'Caricamenti completati'
  if (pending.length === 1) {
    title = 'Caricamento di 1 immagine'
  } else if (pending.length > 1) {
    title = `Caricamento di ${pending.length} immagini`
  }

  return (
    <section
      aria-label="Caricamento immagini"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <h2 className="text-sm font-semibold text-balance" aria-live="polite">
        {title}
      </h2>
      <ul className="mt-2 max-h-72 divide-y overflow-y-auto overscroll-contain">
        {items.map((item) => (
          <UploadItemRow
            key={item.id}
            item={item}
            onRetry={(id) => manager.retry(id)}
            onCancel={(id) => manager.cancel(id)}
            onDismiss={(id) => manager.dismiss(id)}
          />
        ))}
      </ul>
    </section>
  )
}
