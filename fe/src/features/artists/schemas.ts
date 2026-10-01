import { z } from 'zod'
import type { ArtistRequest, ArtistResponse } from '@/lib/types'

// Stesso controllo del backend (ArtistRequest): solo link http/https, cosi' un "javascript:..."
// non puo' mai finire in un src.
const HTTP_URL = /^https?:\/\/\S+$/i

export function isHttpUrl(value: string): boolean {
  return HTTP_URL.test(value)
}

export const artistSchema = z.object({
  name: z.string().trim().min(1, 'Inserisci il nome').max(150, 'Massimo 150 caratteri'),
  genre: z.string().trim().max(100, 'Massimo 100 caratteri'),
  bio: z.string().trim().max(5000, 'Massimo 5000 caratteri'),
  imageUrl: z
    .string()
    .trim()
    .max(500, 'Massimo 500 caratteri')
    .refine((value) => value === '' || isHttpUrl(value), 'Inserisci un link che inizia con http:// o https://'),
})
export type ArtistValues = z.infer<typeof artistSchema>

function emptyToNull(value: string): string | null {
  if (value === '') {
    return null
  }
  return value
}

/** Valori del form -> body della richiesta: i campi facoltativi vuoti diventano null. */
export function toArtistRequest(values: ArtistValues): ArtistRequest {
  return {
    name: values.name,
    genre: emptyToNull(values.genre),
    bio: emptyToNull(values.bio),
    imageUrl: emptyToNull(values.imageUrl),
  }
}

/** Valori iniziali del form: vuoti per un artista nuovo, quelli salvati in modifica. */
export function toArtistValues(artist: ArtistResponse | undefined): ArtistValues {
  if (artist === undefined) {
    return { name: '', genre: '', bio: '', imageUrl: '' }
  }
  return { name: artist.name, genre: artist.genre ?? '', bio: artist.bio ?? '', imageUrl: artist.imageUrl ?? '' }
}
