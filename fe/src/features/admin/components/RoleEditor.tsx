import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errors'
import { ROLE_LABEL } from '@/lib/roles'
import type { AdminUserResponse, Role } from '@/lib/types'
import { useChangeUserRole } from '../hooks/useAdminUsers'
import { parseOption, ROLES } from '../permissions'
import { NativeSelect } from './NativeSelect'

interface RoleEditorProps {
  user: AdminUserResponse
}

/**
 * Cambio ruolo (solo SUPERADMIN). La scelta nel menu non salva da sola: compare "Salva",
 * cosi' un tocco sbagliato non promuove nessuno e non chiude le sessioni dell'utente.
 */
export function RoleEditor({ user }: RoleEditorProps) {
  const [selected, setSelected] = useState<Role>(user.role)
  const mutation = useChangeUserRole()
  const name = `${user.firstName} ${user.lastName}`

  function handleSave() {
    mutation.mutate(
      { id: user.id, role: selected },
      {
        onSuccess: (updated) => toast.success(`${name} ora è ${ROLE_LABEL[updated.role]}`),
        onError: (error) => {
          setSelected(user.role)
          showError(error)
        },
      },
    )
  }

  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label={`Ruolo di ${name}`}
        value={selected}
        disabled={mutation.isPending}
        onChange={(event) => setSelected(parseOption(event.target.value, ROLES) ?? user.role)}
        className="w-44"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
      </NativeSelect>
      {selected !== user.role && (
        <Button size="sm" onClick={handleSave} disabled={mutation.isPending} aria-label={`Salva il ruolo di ${name}`}>
          Salva
        </Button>
      )}
    </div>
  )
}
