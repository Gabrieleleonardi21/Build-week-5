import { useQuery } from '@tanstack/react-query'
import { artistKeys, getArtist } from '../api'

export function useArtist(id: string) {
  return useQuery({
    queryKey: artistKeys.detail(id),
    queryFn: ({ signal }) => getArtist(id, signal),
  })
}
