import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role, StatusChangeRequest } from '@/lib/types'
import { adminKeys, changeUserRole, changeUserStatus, searchAdminUsers, type AdminUserSearchParams } from '../api'

/** Elenco account; cambiando pagina o filtro la lista vecchia resta visibile finche' arriva la nuova. */
export function useAdminUsers(params: AdminUserSearchParams) {
  return useQuery({
    queryKey: adminKeys.userList(params),
    queryFn: ({ signal }) => searchAdminUsers(params, signal),
    placeholderData: keepPreviousData,
  })
}

/** Dopo ogni modifica si ricaricano le liste: con un filtro attivo l'account puo' anche uscire dall'elenco. */
export function useChangeUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: StatusChangeRequest['status'] }) => changeUserStatus(input.id, input.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
  })
}

export function useChangeUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; role: Role }) => changeUserRole(input.id, input.role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users() }),
  })
}
