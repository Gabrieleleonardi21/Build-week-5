import { useQuery } from '@tanstack/react-query'
import { getProfile, profileKeys } from '../api'

/** Profilo completo; si aggiorna da solo quando finisce l'upload dell'avatar (app/uploads.ts). */
export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: ({ signal }) => getProfile(signal),
  })
}
