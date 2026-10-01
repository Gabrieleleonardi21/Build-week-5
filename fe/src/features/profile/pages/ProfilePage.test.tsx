import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProfileResponse, Role, UserResponse } from '@/lib/types'
import { uploadManager } from '@/lib/upload-manager'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

function profile(overrides: Partial<ProfileResponse> = {}): ProfileResponse {
  return {
    id: 'u1',
    email: 'anna@mail.it',
    firstName: 'Anna',
    lastName: 'Bianchi',
    birthDate: '1998-05-14',
    address: { street: 'Via Roma 1', city: 'Milano', postalCode: '20100', province: 'MI', country: 'IT' },
    phone: '+39 333 1234567',
    avatarUrl: null,
    role: 'USER',
    createdAt: '2026-01-10T10:00:00Z',
    ...overrides,
  }
}

interface Backend {
  /** false dopo l'eliminazione dell'account: /api/auth/me risponde 401. */
  logged: boolean
  profile: ProfileResponse
}

/** Backend finto: sessione di Anna e il suo profilo; ogni test aggiunge gli endpoint che prova. */
function setup(overrides: Partial<ProfileResponse> = {}): Backend {
  const backend: Backend = { logged: true, profile: profile(overrides) }
  server.use(
    http.get(`${API}/api/auth/me`, () => {
      if (!backend.logged) {
        return new HttpResponse(null, { status: 401 })
      }
      const me: UserResponse = {
        id: backend.profile.id,
        email: backend.profile.email,
        firstName: backend.profile.firstName,
        lastName: backend.profile.lastName,
        role: backend.profile.role,
        avatarUrl: backend.profile.avatarUrl,
      }
      return HttpResponse.json(me)
    }),
    http.get(`${API}/api/me`, () => HttpResponse.json(backend.profile)),
  )
  return backend
}

function problem(status: number, detail: string, headers: Record<string, string> = {}) {
  return HttpResponse.json({ status, detail }, { status, headers })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProfilePage: dati personali', () => {
  it('mostra i dati del profilo, con l\'email in sola lettura', async () => {
    setup()
    renderRoute('/profile')

    // Primo test del file: la pagina lazy si carica a freddo (con la coverage in CI puo' superare i 5 s).
    expect(await screen.findByLabelText('Nome', undefined, { timeout: 15_000 })).toHaveValue('Anna')
    expect(screen.getByLabelText('Cognome')).toHaveValue('Bianchi')
    expect(screen.getByLabelText('Email')).toHaveValue('anna@mail.it')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Data di nascita')).toHaveValue('1998-05-14')
    expect(screen.getByLabelText('Telefono')).toHaveValue('+39 333 1234567')
    expect(screen.getByLabelText('Città')).toHaveValue('Milano')
    expect(screen.getByText('Utente')).toBeInTheDocument()
    // Niente modifiche: niente salvataggio.
    expect(screen.getByRole('button', { name: 'Salva modifiche' })).toBeDisabled()
  })

  it('profilo senza indirizzo (address null): campi vuoti', async () => {
    setup({ address: null, phone: null })
    renderRoute('/profile')

    expect(await screen.findByLabelText('Via e numero')).toHaveValue('')
    expect(screen.getByLabelText('Telefono')).toHaveValue('')
  })

  it('salva le modifiche e aggiorna il nome nell\'header', async () => {
    const backend = setup()
    const bodies: unknown[] = []
    server.use(
      http.put(`${API}/api/me`, async ({ request }) => {
        const body = (await request.json()) as Partial<ProfileResponse>
        bodies.push(body)
        backend.profile = { ...backend.profile, ...body }
        return HttpResponse.json(backend.profile)
      }),
    )
    renderRoute('/profile')
    const user = userEvent.setup()

    const firstName = await screen.findByLabelText('Nome')
    await user.clear(firstName)
    await user.type(firstName, 'Annalisa')
    await user.clear(screen.getByLabelText('Telefono'))
    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    expect(await screen.findByRole('button', { name: 'Menu di Annalisa Bianchi' })).toBeInTheDocument()
    expect(bodies).toEqual([
      {
        firstName: 'Annalisa',
        lastName: 'Bianchi',
        birthDate: '1998-05-14',
        phone: '',
        address: { street: 'Via Roma 1', city: 'Milano', postalCode: '20100', province: 'MI', country: 'IT' },
      },
    ])
    // I valori salvati sono il nuovo punto di partenza: il bottone torna disattivo.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salva modifiche' })).toBeDisabled())
  })

  it('validazione nel browser e errori di campo del backend', async () => {
    setup()
    let calls = 0
    server.use(
      http.put(`${API}/api/me`, () => {
        calls += 1
        return HttpResponse.json(
          { status: 400, detail: 'Dati non validi', errors: { 'address.province': "La provincia e' una sigla di 2 lettere" } },
          { status: 400 },
        )
      }),
    )
    renderRoute('/profile')
    const user = userEvent.setup()

    const phone = await screen.findByLabelText('Telefono')
    await user.clear(phone)
    await user.type(phone, 'abc')
    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    expect(await screen.findByText(/Numero non valido/)).toBeInTheDocument()
    expect(calls).toBe(0)

    await user.clear(phone)
    await user.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    expect(await screen.findByText("La provincia e' una sigla di 2 lettere")).toBeInTheDocument()
    expect(screen.getByLabelText('Provincia')).toHaveAttribute('aria-invalid', 'true')
  })

  it('errore di caricamento: messaggio e Riprova', async () => {
    setup()
    server.use(http.get(`${API}/api/me`, () => problem(503, 'Servizio momentaneamente non disponibile')))
    renderRoute('/profile')

    expect(await screen.findByRole('alert')).toHaveTextContent('Servizio momentaneamente non disponibile')
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })
})

describe('ProfilePage: avatar', () => {
  it('il file scelto entra nella coda degli upload come avatar', async () => {
    setup()
    const enqueue = vi
      .spyOn(uploadManager, 'enqueue')
      .mockReturnValue({ accepted: [], rejected: [{ fileName: 'foto.png', reason: 'foto.png: supera i 5 MB' }], settled: Promise.resolve([]) })
    renderRoute('/profile')

    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await userEvent.setup().upload(await screen.findByLabelText('Scegli la foto del profilo'), file)

    expect(enqueue).toHaveBeenCalledWith([file], { kind: 'avatar' })
  })

  it('rimuove la foto dopo la conferma', async () => {
    const backend = setup({ avatarUrl: 'https://img.test/anna.jpg' })
    let deleted = 0
    server.use(
      http.delete(`${API}/api/me/avatar`, () => {
        deleted += 1
        backend.profile = { ...backend.profile, avatarUrl: null }
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/profile')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Rimuovi' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Rimuovi foto' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Rimuovi' })).not.toBeInTheDocument())
    expect(deleted).toBe(1)
    expect(screen.getByRole('button', { name: 'Carica una foto' })).toBeInTheDocument()
  })
})

async function fillPassword(current: string, next: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Password attuale'), current)
  await user.type(screen.getByLabelText('Nuova password'), next)
  await user.type(screen.getByLabelText('Ripeti la nuova password'), confirm)
  await user.click(screen.getByRole('button', { name: 'Cambia password' }))
}

describe('ProfilePage: cambio password', () => {
  it('successo: invia attuale e nuova, svuota il form e rilegge il token CSRF', async () => {
    setup()
    const bodies: unknown[] = []
    let csrfCalls = 0
    let csrfCallsAtChange = Number.POSITIVE_INFINITY
    server.use(
      http.get(`${API}/api/auth/csrf`, () => {
        csrfCalls += 1
        return HttpResponse.json({ headerName: 'X-XSRF-TOKEN', token: `token-${csrfCalls}` })
      }),
      http.put(`${API}/api/me/password`, async ({ request }) => {
        bodies.push(await request.json())
        csrfCallsAtChange = csrfCalls
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/profile')

    await fillPassword('Password123!', 'NuovaPassword456!', 'NuovaPassword456!')

    await waitFor(() => expect(screen.getByLabelText('Password attuale')).toHaveValue(''))
    expect(screen.getByLabelText('Nuova password')).toHaveValue('')
    expect(screen.getByLabelText('Ripeti la nuova password')).toHaveValue('')
    // La conferma resta nel browser: al backend vanno solo le due password.
    expect(bodies).toEqual([{ currentPassword: 'Password123!', newPassword: 'NuovaPassword456!' }])
    // Dopo il cambio il token viene riletto (una chiamata in piu' rispetto al momento della PUT).
    await waitFor(() => expect(csrfCalls).toBeGreaterThan(csrfCallsAtChange))
  })

  it('password attuale sbagliata: errore sotto il campo, con il focus', async () => {
    setup()
    server.use(http.put(`${API}/api/me/password`, () => problem(400, 'Password attuale non corretta')))
    renderRoute('/profile')

    await fillPassword('sbagliata', 'NuovaPassword456!', 'NuovaPassword456!')

    expect(await screen.findByText('La password attuale non è corretta')).toBeInTheDocument()
    const current = screen.getByLabelText('Password attuale')
    expect(current).toHaveAttribute('aria-invalid', 'true')
    expect(current).toHaveFocus()
    // I valori restano: l'utente corregge solo la password attuale.
    expect(screen.getByLabelText('Nuova password')).toHaveValue('NuovaPassword456!')
  })

  it('conferma diversa, nuova troppo corta o uguale all\'attuale: nessuna chiamata', async () => {
    setup()
    let calls = 0
    server.use(
      http.put(`${API}/api/me/password`, () => {
        calls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const first = renderRoute('/profile')
    await fillPassword('Password123!', 'NuovaPassword456!', 'NuovaPassword999!')
    expect(await screen.findByText('Le due password non coincidono')).toBeInTheDocument()
    first.unmount()

    const second = renderRoute('/profile')
    await fillPassword('Password123!', 'corta', 'corta')
    expect(await screen.findByText('Almeno 8 caratteri', { selector: '[role="alert"]' })).toBeInTheDocument()
    second.unmount()

    renderRoute('/profile')
    await fillPassword('Password123!', 'Password123!', 'Password123!')
    expect(await screen.findByText('La nuova password deve essere diversa da quella attuale')).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('400 sulla nuova password dal backend: errore sotto "Nuova password"', async () => {
    setup()
    server.use(http.put(`${API}/api/me/password`, () => problem(400, 'Password troppo lunga')))
    renderRoute('/profile')

    await fillPassword('Password123!', 'NuovaPassword456!', 'NuovaPassword456!')

    expect(await screen.findByText('Password troppo lunga')).toBeInTheDocument()
    expect(screen.getByLabelText('Nuova password')).toHaveAttribute('aria-invalid', 'true')
  })

  it('429: troppi tentativi, bottone bloccato per il tempo di Retry-After', async () => {
    setup()
    server.use(http.put(`${API}/api/me/password`, () => problem(429, 'Troppi tentativi', { 'Retry-After': '900' })))
    renderRoute('/profile')

    await fillPassword('sbagliata', 'NuovaPassword456!', 'NuovaPassword456!')

    expect(await screen.findByText('Troppi tentativi. Riprova tra 15 minuti.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Riprova tra 15 minuti/ })).toBeDisabled()
  })
})

async function confirmDelete(password: string) {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Elimina account' }))
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByLabelText('Conferma con la tua password'), password)
  await user.click(within(dialog).getByRole('button', { name: 'Elimina definitivamente' }))
  return dialog
}

describe('ProfilePage: eliminazione account', () => {
  it('con la password giusta: account eliminato, si torna anonimi sulla home', async () => {
    const backend = setup()
    const bodies: unknown[] = []
    let logoutCalls = 0
    server.use(
      http.delete(`${API}/api/me`, async ({ request }) => {
        bodies.push(await request.json())
        backend.logged = false
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(`${API}/api/auth/logout`, () => {
        logoutCalls += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router } = renderRoute('/profile')

    await confirmDelete('Password123!')

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('link', { name: 'Registrati' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Menu di/ })).not.toBeInTheDocument()
    expect(bodies).toEqual([{ password: 'Password123!' }])
    // La sessione e' gia' chiusa dal backend: niente POST /logout.
    expect(logoutCalls).toBe(0)
  })

  it('password sbagliata: errore nel dialog, che resta aperto', async () => {
    setup()
    server.use(http.delete(`${API}/api/me`, () => problem(400, 'Password attuale non corretta')))
    const { router } = renderRoute('/profile')

    const dialog = await confirmDelete('sbagliata')

    expect(await within(dialog).findByText('La password non è corretta')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/profile')
  })

  it('429: troppi tentativi', async () => {
    setup()
    server.use(http.delete(`${API}/api/me`, () => problem(429, 'Troppi tentativi', { 'Retry-After': '60' })))
    renderRoute('/profile')

    const dialog = await confirmDelete('sbagliata')

    expect(await within(dialog).findByText('Troppi tentativi. Riprova tra 1 minuto.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Riprova tra/ })).toBeDisabled()
  })

  it('un SUPERADMIN non vede il bottone: il backend rifiuterebbe', async () => {
    const role: Role = 'SUPERADMIN'
    setup({ role })
    renderRoute('/profile')

    expect(await screen.findByText(/Un super amministratore non può eliminare/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elimina account' })).not.toBeInTheDocument()
  })
})
