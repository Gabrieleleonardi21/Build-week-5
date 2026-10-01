import { CameraIcon, TrashIcon } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/data/UserAvatar'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { authKeys } from '@/features/auth/api'
import { useUploads } from '@/hooks/useUploads'
import { IMAGE_TYPES } from '@/lib/upload'
import { uploadManager, type UploadItem } from '@/lib/upload-manager'
import type { ProfileResponse } from '@/lib/types'
import { deleteAvatar, profileKeys } from '../api'

interface AvatarSectionProps {
  profile: ProfileResponse
}

// Fuori dal componente: riferimento stabile per useUploads (niente ricalcoli a ogni render).
function isAvatarInProgress(item: UploadItem): boolean {
  return item.target.kind === 'avatar' && (item.status === 'queued' || item.status === 'uploading' || item.status === 'processing')
}

/**
 * Foto del profilo. Il caricamento passa dalla coda globale (uploadManager): avanzamento, annulla e
 * riprova sono nel pannello in basso, e a upload finito app/uploads.ts ricarica profilo e header.
 */
export function AvatarSection({ profile }: AvatarSectionProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const isUploading = useUploads(isAvatarInProgress).length > 0

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Si azzera il campo: scegliendo di nuovo lo stesso file l'evento change riparte.
    event.target.value = ''
    if (file === undefined) {
      return
    }
    const result = uploadManager.enqueue([file], { kind: 'avatar' })
    for (const rejected of result.rejected) {
      toast.error(rejected.reason)
    }
  }

  async function handleRemove() {
    await deleteAvatar()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKeys.me }),
      queryClient.invalidateQueries({ queryKey: authKeys.me }),
    ])
    toast.success('Foto del profilo rimossa')
  }

  let uploadLabel = 'Carica una foto'
  if (profile.avatarUrl !== null) {
    uploadLabel = 'Cambia foto'
  }
  if (isUploading) {
    uploadLabel = 'Caricamento…'
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <UserAvatar firstName={profile.firstName} lastName={profile.lastName} avatarUrl={profile.avatarUrl} className="size-20 text-xl" />
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            onChange={handleFile}
            className="sr-only"
            aria-label="Scegli la foto del profilo"
            tabIndex={-1}
          />
          <Button type="button" variant="outline" disabled={isUploading} onClick={() => inputRef.current?.click()}>
            <CameraIcon data-icon="inline-start" aria-hidden="true" />
            {uploadLabel}
          </Button>
          {profile.avatarUrl !== null && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" disabled={isUploading}>
                  <TrashIcon data-icon="inline-start" aria-hidden="true" />
                  Rimuovi
                </Button>
              }
              title="Rimuovere la foto del profilo?"
              description="Al suo posto compariranno le tue iniziali. Puoi caricarne un'altra quando vuoi."
              confirmLabel="Rimuovi foto"
              destructive
              onConfirm={handleRemove}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG o WebP, massimo 5 MB.</p>
      </div>
    </div>
  )
}
