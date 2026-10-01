import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { artistKeys, searchArtists, type ArtistSearchParams } from '../api'

/** Lista degli artisti; cambiando pagina o ricerca la lista vecchia resta finche' arriva la nuova. */
export function useArtists(params: ArtistSearchParams) {
  return useQuery({
    queryKey: artistKeys.list(params),
    queryFn: ({ signal }) => searchArtists(params, signal),
    placeholderData: keepPreviousData,
  })
}
