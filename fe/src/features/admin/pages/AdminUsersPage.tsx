import { UsersIcon } from '@phosphor-icons/react'
import { useAuth } from '@/components/auth/auth-context'
import { Pagination } from '@/components/data/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { QueryState } from '@/components/feedback/QueryState'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { AdminUserFilters } from '../components/AdminUserFilters'
import { AdminUserTable, AdminUserTableSkeleton } from '../components/AdminUserTable'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { parseOption, ROLES, STATUSES } from '../permissions'

const FILTER_KEYS = ['q', 'role', 'status'] as const
const PAGE_SIZE = 20

function resultsLabel(total: number): string {
  if (total === 1) {
    return '1 account'
  }
  return `${total} account`
}

/** Moderazione degli account (/admin/users): ricerca, attiva/disattiva e, per i SUPERADMIN, cambio ruolo. */
export function AdminUsersPage() {
  const { user } = useAuth()
  const filters = useUrlFilters(FILTER_KEYS)
  const { q, role, status } = filters.values
  const users = useAdminUsers({
    q,
    // I filtri arrivano dall'URL, che chiunque puo' scrivere a mano: valori sconosciuti si ignorano.
    role: parseOption(role, ROLES),
    status: parseOption(status, STATUSES),
    page: filters.page,
    size: PAGE_SIZE,
  })

  // La guardia RequireRole garantisce l'utente; il controllo serve solo a TypeScript.
  if (user === null) {
    return null
  }

  let count = null
  if (users.data !== undefined && users.data.page.totalElements > 0) {
    count = (
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {resultsLabel(users.data.page.totalElements)}
      </p>
    )
  }

  let intro = 'Puoi disattivare e riattivare gli account con ruolo Utente.'
  if (user.role === 'SUPERADMIN') {
    intro = 'Puoi disattivare o riattivare qualsiasi account e cambiare i ruoli, tranne i tuoi.'
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 pb-16">
      <title>Moderazione · Tourevents</title>
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Moderazione degli account</h1>
        <p className="max-w-prose text-muted-foreground">{intro}</p>
      </header>
      <AdminUserFilters values={{ q, role, status }} onSearch={(next) => filters.setFilters(next)} onClear={filters.clear} />
      <section aria-labelledby="accounts-title" className="grid gap-4">
        <div className="flex items-baseline justify-between gap-4 border-t pt-6">
          <h2 id="accounts-title" className="text-xl font-semibold tracking-tight">
            Account
          </h2>
          {count}
        </div>
        <QueryState
          query={users}
          loading={<AdminUserTableSkeleton />}
          isEmpty={(data) => data.content.length === 0}
          empty={
            <EmptyState
              icon={<UsersIcon />}
              title="Nessun account trovato"
              description="Prova con un'altra email o un altro nome, oppure cancella i filtri qui sopra."
            />
          }
        >
          {(data) => (
            <>
              <AdminUserTable users={data.content} me={user} />
              <Pagination
                page={data.page}
                onPageChange={(page) => {
                  filters.setPage(page)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </>
          )}
        </QueryState>
      </section>
    </div>
  )
}
