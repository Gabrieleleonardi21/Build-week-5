import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AdminUserResponse, Page, Role, UserResponse } from '@/lib/types'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { canChangeRole, canChangeStatus, parseOption, ROLES } from '../permissions'

const ME_ID = 'me'

function account(overrides: Partial<AdminUserResponse> = {}): AdminUserResponse {
  return {
    id: 'u1',
    email: 'luca@mail.it',
    firstName: 'Luca',
    lastName: 'Moretti',
    role: 'USER',
    status: 'ACTIVE',
    emailVerifiedAt: '2026-01-10T10:00:00Z',
    anonymizedAt: null,
    createdAt: '2026-01-10T10:00:00Z',
    ...overrides,
  }
}

function me(role: Role): UserResponse {
  return { id: ME_ID, email: 'admin@mail.it', firstName: 'Ada', lastName: 'Admin', role, avatarUrl: null }
}

function pageOf(content: AdminUserResponse[], totalPages = 1): Page<AdminUserResponse> {
  return { content, page: { size: 20, number: 0, totalElements: content.length, totalPages } }
}

/** Backend finto: l'elenco e' modificabile dalle PATCH, come quello vero. Restituisce le query ricevute. */
function setup(role: Role, accounts: AdminUserResponse[]) {
  const state = { accounts, queries: [] as string[] }
  server.use(
    http.get(`${API}/api/auth/me`, () => HttpResponse.json(me(role))),
    http.get(`${API}/api/admin/users`, ({ request }) => {
      state.queries.push(new URL(request.url).search)
      return HttpResponse.json(pageOf(state.accounts))
    }),
  )
  return state
}

function rowOf(name: string): HTMLElement {
  return screen.getByRole('rowheader', { name: new RegExp(name) }).closest('tr') as HTMLElement
}

describe('AdminUsersPage', () => {
  it('mostra gli account con ruolo, stato e i soli comandi ammessi a un MODERATOR', async () => {
    setup('MODERATOR', [
      account(),
      account({ id: 'u2', firstName: 'Sara', lastName: 'Colombo', email: 'sara@mail.it', role: 'MODERATOR' }),
      account({ id: 'u3', firstName: 'Utente', lastName: 'eliminato', email: 'anonimo-u3@anonimizzato.invalid', status: 'DEACTIVATED', anonymizedAt: '2026-05-01T10:00:00Z' }),
      account({ id: ME_ID, firstName: 'Ada', lastName: 'Admin', email: 'admin@mail.it', role: 'MODERATOR' }),
      account({ id: 'u5', firstName: 'Elena', lastName: 'Greco', email: 'elena@mail.it', status: 'PENDING_VERIFICATION' }),
    ])
    renderRoute('/admin/users')

    // Primo test del file: la pagina lazy si carica a freddo (con la coverage in CI puo' superare i 5 s).
    expect(await screen.findByRole('rowheader', { name: /Luca Moretti/ }, { timeout: 15_000 })).toHaveTextContent('luca@mail.it')
    expect(screen.getByText('5 account')).toBeInTheDocument()

    // USER attivo: si puo' disattivare; il MODERATOR non cambia i ruoli.
    expect(within(rowOf('Luca Moretti')).getByRole('button', { name: 'Disattiva Luca Moretti' })).toBeInTheDocument()
    expect(within(rowOf('Luca Moretti')).getByText('Attivo')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Ruolo di/ })).not.toBeInTheDocument()
    // Un altro moderatore, un account eliminato e se stessi: nessun comando.
    expect(within(rowOf('Sara Colombo')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(rowOf('Utente eliminato')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(rowOf('Utente eliminato')).getByText('Eliminato')).toBeInTheDocument()
    expect(within(rowOf('Ada Admin')).getByText('Il tuo account')).toBeInTheDocument()
    expect(within(rowOf('Ada Admin')).queryByRole('button')).not.toBeInTheDocument()
    expect(within(rowOf('Elena Greco')).getByText('Da verificare')).toBeInTheDocument()
  })

  it('filtri: dall\'URL alla richiesta, e dal form all\'URL', async () => {
    const state = setup('MODERATOR', [account()])
    const { router } = renderRoute('/admin/users?q=luca&role=USER&status=NON_ESISTE')

    expect(await screen.findByLabelText('Email, nome o cognome')).toHaveValue('luca')
    expect(screen.getByLabelText('Ruolo')).toHaveValue('USER')
    // Lo stato sconosciuto scritto a mano nell'URL non arriva al backend.
    await waitFor(() => expect(state.queries.at(-1)).toBe('?q=luca&role=USER&page=0&size=20'))

    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Stato'), 'DEACTIVATED')
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    await waitFor(() => expect(router.state.location.search).toBe('?q=luca&role=USER&status=DEACTIVATED'))
    await waitFor(() => expect(state.queries.at(-1)).toBe('?q=luca&role=USER&status=DEACTIVATED&page=0&size=20'))

    await user.click(screen.getByRole('button', { name: 'Cancella filtri' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('disattiva con conferma e riattiva senza', async () => {
    const state = setup('MODERATOR', [account()])
    const bodies: unknown[] = []
    server.use(
      http.patch(`${API}/api/admin/users/u1/status`, async ({ request }) => {
        const body = (await request.json()) as { status: 'ACTIVE' | 'DEACTIVATED' }
        bodies.push(body)
        state.accounts = [account({ status: body.status })]
        return HttpResponse.json(state.accounts[0])
      }),
    )
    renderRoute('/admin/users')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Disattiva Luca Moretti' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent("Disattivare l'account di Luca Moretti?")
    await user.click(within(dialog).getByRole('button', { name: 'Disattiva account' }))

    await user.click(await screen.findByRole('button', { name: 'Riattiva Luca Moretti' }))
    expect(await screen.findByRole('button', { name: 'Disattiva Luca Moretti' })).toBeInTheDocument()
    expect(bodies).toEqual([{ status: 'DEACTIVATED' }, { status: 'ACTIVE' }])
  })

  it('SUPERADMIN: cambia il ruolo solo dopo "Salva"', async () => {
    const state = setup('SUPERADMIN', [account(), account({ id: ME_ID, firstName: 'Ada', lastName: 'Admin', email: 'admin@mail.it', role: 'SUPERADMIN' })])
    const bodies: unknown[] = []
    server.use(
      http.patch(`${API}/api/admin/users/u1/role`, async ({ request }) => {
        const body = (await request.json()) as { role: Role }
        bodies.push(body)
        state.accounts = [account({ role: body.role })]
        return HttpResponse.json(state.accounts[0])
      }),
    )
    renderRoute('/admin/users')
    const user = userEvent.setup()

    const select = await screen.findByRole('combobox', { name: 'Ruolo di Luca Moretti' })
    // Il proprio ruolo non si cambia.
    expect(screen.queryByRole('combobox', { name: 'Ruolo di Ada Admin' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salva il ruolo di Luca Moretti' })).not.toBeInTheDocument()

    await user.selectOptions(select, 'MODERATOR')
    expect(bodies).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Salva il ruolo di Luca Moretti' }))

    await waitFor(() => expect(bodies).toEqual([{ role: 'MODERATOR' }]))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Ruolo di Luca Moretti' })).toHaveValue('MODERATOR'))
    expect(screen.queryByRole('button', { name: 'Salva il ruolo di Luca Moretti' })).not.toBeInTheDocument()
  })

  it('errore del backend sul cambio ruolo: il menu torna al ruolo salvato', async () => {
    setup('SUPERADMIN', [account()])
    server.use(
      http.patch(`${API}/api/admin/users/u1/role`, () =>
        HttpResponse.json({ status: 400, detail: "Account anonimizzato: non si puo' modificare" }, { status: 400 }),
      ),
    )
    renderRoute('/admin/users')
    const user = userEvent.setup()

    const select = await screen.findByRole('combobox', { name: 'Ruolo di Luca Moretti' })
    await user.selectOptions(select, 'SUPERADMIN')
    await user.click(screen.getByRole('button', { name: 'Salva il ruolo di Luca Moretti' }))

    await waitFor(() => expect(select).toHaveValue('USER'))
  })

  it('nessun risultato e errore di caricamento', async () => {
    setup('MODERATOR', [])
    const first = renderRoute('/admin/users?q=zzz')
    expect(await screen.findByRole('heading', { name: 'Nessun account trovato' })).toBeInTheDocument()
    first.unmount()

    server.use(http.get(`${API}/api/admin/users`, () => HttpResponse.json({ status: 403, detail: 'Operazione riservata ai moderatori' }, { status: 403 })))
    renderRoute('/admin/users')
    expect(await screen.findByRole('alert')).toHaveTextContent('Operazione riservata ai moderatori')
  })
})

describe('permessi (stesse regole di AdminUserService)', () => {
  it('stato: MODERATOR solo sugli USER, SUPERADMIN su tutti, mai su se stessi o su account eliminati', () => {
    expect(canChangeStatus(me('MODERATOR'), account())).toBe(true)
    expect(canChangeStatus(me('MODERATOR'), account({ role: 'MODERATOR' }))).toBe(false)
    expect(canChangeStatus(me('SUPERADMIN'), account({ role: 'SUPERADMIN' }))).toBe(true)
    expect(canChangeStatus(me('SUPERADMIN'), account({ id: ME_ID }))).toBe(false)
    expect(canChangeStatus(me('SUPERADMIN'), account({ anonymizedAt: '2026-05-01T10:00:00Z' }))).toBe(false)
  })

  it('ruolo: solo SUPERADMIN', () => {
    expect(canChangeRole(me('MODERATOR'), account())).toBe(false)
    expect(canChangeRole(me('SUPERADMIN'), account())).toBe(true)
    expect(canChangeRole(me('SUPERADMIN'), account({ id: ME_ID }))).toBe(false)
  })

  it('parseOption ignora i valori sconosciuti', () => {
    expect(parseOption('MODERATOR', ROLES)).toBe('MODERATOR')
    expect(parseOption('ROOT', ROLES)).toBeNull()
    expect(parseOption('', ROLES)).toBeNull()
  })
})
