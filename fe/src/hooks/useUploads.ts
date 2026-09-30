import { useMemo, useSyncExternalStore } from 'react'
import { uploadManager, type UploadItem, type UploadManager } from '@/lib/upload-manager'

/**
 * Upload in corso e appena finiti, aggiornati in tempo reale.
 * filter serve ai componenti che mostrano solo i propri (es. le foto di un evento).
 */
export function useUploads(
  filter?: (item: UploadItem) => boolean,
  manager: UploadManager = uploadManager,
): readonly UploadItem[] {
  const items = useSyncExternalStore(manager.subscribe, manager.getSnapshot)
  return useMemo(() => {
    if (filter === undefined) {
      return items
    }
    return items.filter(filter)
  }, [items, filter])
}
