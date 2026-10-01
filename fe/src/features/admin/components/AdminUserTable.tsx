import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/form/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { showError } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { ROLE_LABEL } from '@/lib/roles'
import type { AdminUserResponse, UserResponse } from '@/lib/types'
import { useChangeUserStatus } from '../hooks/useAdminUsers'
import { canChangeRole, canChangeStatus, STATUS_LABEL } from '../permissions'
import { RoleEditor } from './RoleEditor'

function StatusCell({ user }: { user: AdminUserResponse }) {
  // Account eliminato dall'utente (D15): resta in elenco ma non e' piu' una persona.
  if (user.anonymizedAt !== null) {
    return <Badge variant="outline">Eliminato</Badge>
  }
  if (user.status === 'DEACTIVATED') {
    return <Badge variant="destructive">{STATUS_LABEL.DEACTIVATED}</Badge>
  }
  if (user.status === 'PENDING_VERIFICATION') {
    return <Badge variant="outline">{STATUS_LABEL.PENDING_VERIFICATION}</Badge>
  }
  return <Badge variant="secondary">{STATUS_LABEL.ACTIVE}</Badge>
}

interface RowProps {
  user: AdminUserResponse
  me: UserResponse
}

function StatusAction({ user, me }: RowProps) {
  const mutation = useChangeUserStatus()
  const name = `${user.firstName} ${user.lastName}`

  if (user.id === me.id) {
    return <span className="text-sm text-muted-foreground">Il tuo account</span>
  }
  if (!canChangeStatus(me, user)) {
    return null
  }
  if (user.status === 'DEACTIVATED') {
    return (
      <Button
        variant="outline"
        disabled={mutation.isPending}
        aria-label={`Riattiva ${name}`}
        onClick={() =>
          mutation.mutate(
            { id: user.id, status: 'ACTIVE' },
            { onSuccess: () => toast.success(`Account di ${name} riattivato`), onError: showError },
          )
        }
      >
        Riattiva
      </Button>
    )
  }
  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" aria-label={`Disattiva ${name}`}>
          Disattiva
        </Button>
      }
      title={`Disattivare l'account di ${name}?`}
      description="Viene disconnesso subito e non potrà più accedere finché l'account non viene riattivato."
      confirmLabel="Disattiva account"
      destructive
      onConfirm={async () => {
        await mutation.mutateAsync({ id: user.id, status: 'DEACTIVATED' })
        toast.success(`Account di ${name} disattivato`)
      }}
    />
  )
}

function UserRow({ user, me }: RowProps) {
  let role = <span>{ROLE_LABEL[user.role]}</span>
  if (canChangeRole(me, user)) {
    // key: quando il ruolo salvato cambia, il menu riparte dal valore nuovo.
    role = <RoleEditor key={user.role} user={user} />
  }
  return (
    <TableRow>
      {/* Intestazione di riga: gli screen reader annunciano il nome leggendo le altre celle. */}
      <TableHead scope="row" className="h-auto py-3 font-normal whitespace-normal">
        <span className="block font-medium text-foreground">
          {user.firstName} {user.lastName}
        </span>
        <span className="block text-sm break-all text-muted-foreground">{user.email}</span>
      </TableHead>
      <TableCell>{role}</TableCell>
      <TableCell>
        <StatusCell user={user} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
        <time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time>
      </TableCell>
      <TableCell className="text-right">
        <StatusAction user={user} me={me} />
      </TableCell>
    </TableRow>
  )
}

interface AdminUserTableProps {
  users: readonly AdminUserResponse[]
  me: UserResponse
}

/**
 * Tabella degli account. Su schermi stretti scorre in orizzontale dentro il suo riquadro
 * (la pagina no) e la colonna meno utile, la data di registrazione, si nasconde.
 */
export function AdminUserTable({ users, me }: AdminUserTableProps) {
  return (
    <div className="rounded-2xl border bg-card px-2">
      <Table>
        <caption className="sr-only">Account registrati</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Account</TableHead>
            <TableHead scope="col">Ruolo</TableHead>
            <TableHead scope="col">Stato</TableHead>
            <TableHead scope="col" className="hidden md:table-cell">
              Registrato il
            </TableHead>
            <TableHead scope="col" className="text-right">
              Azioni
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserRow key={user.id} user={user} me={me} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Scheletro con la stessa forma della tabella. */
export function AdminUserTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-2xl border bg-card" aria-label="Caricamento account…">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-4 border-b p-4 last:border-b-0">
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-24" />
        </li>
      ))}
    </ul>
  )
}
