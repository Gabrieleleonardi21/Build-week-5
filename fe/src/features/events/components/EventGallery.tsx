import type { EventImageResponse } from '@/lib/types'

interface EventGalleryProps {
  title: string
  images: readonly EventImageResponse[]
}

/** Copertina grande (sortOrder 0) e le altre foto in miniatura sotto. */
export function EventGallery({ title, images }: EventGalleryProps) {
  const [cover, ...others] = images
  if (cover === undefined) {
    return null
  }
  return (
    <div className="grid gap-3">
      <img
        src={cover.url}
        alt={`Foto di ${title}`}
        width={1200}
        height={800}
        fetchPriority="high"
        className="aspect-[3/2] w-full rounded-2xl object-cover"
      />
      {others.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {others.map((image, index) => (
            <li key={image.id}>
              <img
                src={image.url}
                alt={`Foto ${index + 2} di ${title}`}
                width={400}
                height={300}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
