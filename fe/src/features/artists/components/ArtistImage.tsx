import { MicrophoneStageIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { isHttpUrl } from '../schemas'

interface ArtistImageProps {
  imageUrl: string | null
  /** Testo alternativo; vuoto quando il nome e' gia' scritto accanto (immagine decorativa). */
  alt: string
  size: number
  loading?: 'eager' | 'lazy'
  className?: string
}

/**
 * Foto quadrata dell'artista. Il link lo scrivono gli utenti e punta a siti esterni: se manca,
 * non e' http/https o non si carica, resta il segnaposto invece dell'icona di immagine rotta.
 */
export function ArtistImage({ imageUrl, alt, size, loading = 'lazy', className }: ArtistImageProps) {
  const [failed, setFailed] = useState(false)
  if (imageUrl === null || failed || !isHttpUrl(imageUrl)) {
    return (
      <div className={cn('grid aspect-square place-items-center bg-muted text-muted-foreground', className)} aria-hidden="true">
        <MicrophoneStageIcon size={32} />
      </div>
    )
  }
  return (
    <img
      src={imageUrl}
      alt={alt}
      width={size}
      height={size}
      loading={loading}
      onError={() => setFailed(true)}
      className={cn('aspect-square w-full object-cover', className)}
    />
  )
}
