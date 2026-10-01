import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_LABEL } from '@/lib/roles'
import { ROLES, STATUS_LABEL, STATUSES } from '../permissions'
import { NativeSelect } from './NativeSelect'

export interface AdminUserFilterValues {
  q: string
  role: string
  status: string
}

interface AdminUserFiltersProps {
  values: AdminUserFilterValues
  onSearch: (values: AdminUserFilterValues) => void
  onClear: () => void
}

/** Ricerca per email o nome e filtri per ruolo e stato: si applica all'invio, come nella home. */
export function AdminUserFilters({ values, onSearch, onClear }: AdminUserFiltersProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSearch({ q: String(data.get('q') ?? ''), role: String(data.get('role') ?? ''), status: String(data.get('status') ?? '') })
  }

  const hasFilters = values.q !== '' || values.role !== '' || values.status !== ''
  return (
    // key: se l'URL cambia (Indietro, "Cancella filtri") i campi ripartono dai valori dell'URL.
    <form
      key={`${values.q}|${values.role}|${values.status}`}
      role="search"
      aria-label="Cerca account"
      onSubmit={handleSubmit}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end"
    >
      <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="admin-q">Email, nome o cognome</Label>
        <Input id="admin-q" name="q" type="search" defaultValue={values.q} placeholder="anna@esempio.it…" autoComplete="off" maxLength={100} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="admin-role">Ruolo</Label>
        <NativeSelect id="admin-role" name="role" defaultValue={values.role}>
          <option value="">Tutti i ruoli</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="admin-status">Stato</Label>
        <NativeSelect id="admin-status" name="status" defaultValue={values.status}>
          <option value="">Tutti gli stati</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit">
          <MagnifyingGlassIcon data-icon="inline-start" aria-hidden="true" />
          Cerca
        </Button>
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Cancella filtri
          </Button>
        )}
      </div>
    </form>
  )
}
