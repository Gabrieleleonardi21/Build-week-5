import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { UserResponse } from '@/lib/types'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { safeReturnPath } from '@/lib/navigation'

const ANNA: UserResponse = { id: 'u1', email: 'anna@mail.it', firstName: 'Anna', lastName: 'Bianchi', role: 'USER', avatarUrl: null }

/** Backend finto: anonimo finche' il login non riesce, poi /me restituisce Anna. */
function authApi(login: () => Response) {
  let logged = false
  const bodies: unknown[] = []
  server.use(
    http.get(`${API}/api/auth/me`, () => {
      if (logged) {
        return HttpResponse.json(ANNA)
      }
      return new HttpResponse(null, { status: 401 })
    }),
    http.post(`${API}/api/auth/login`, async ({ request }) => {
      bodies.push(await request.json())
      const response = login()
      logged = response.status === 200
      return response
    }),
  )
  return bodies
}

async function fillLogin(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Accedi' }))
}

describe('LoginPage', () => {
  it('login riuscito: torna alla pagina richiesta prima del login', async () => {
    const bodies = authApi(() => HttpResponse.json(ANNA))
    const { router } = renderRoute('/me/tickets')
    await screen.findByRole('heading', { name: 'Accedi' })

    await fillLogin('anna@mail.it', 'Password123!')

    await waitFor(() => expect(router.state.location.pathname).toBe('/me/tickets'))
    expect(bodies).toEqual([{ email: 'anna@mail.it', password: 'Password123!' }])
  })

  it('401: messaggio unico per email o password sbagliate', async () => {
    authApi(() => HttpResponse.json({ status: 401, detail: 'Credenziali non valide' }, { status: 401 }))
    renderRoute('/login')

    await fillLogin('anna@mail.it', 'sbagliata')

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o password non corretti.')
  })

  it('email non verificata: va alla verifica con l\'email', async () => {
    authApi(() => HttpResponse.json({ status: 403, detail: 'Email non verificata', code: 'EMAIL_NOT_VERIFIED' }, { status: 403 }))
    const { router } = renderRoute('/login')

    await fillLogin('anna@mail.it', 'Password123!')

    await waitFor(() => expect(router.state.location.pathname).toBe('/verify'))
    expect(router.state.location.search).toBe('?email=anna%40mail.it')
  })

  it('account disattivato e troppi tentativi', async () => {
    authApi(() => HttpResponse.json({ status: 403, detail: 'Account disattivato', code: 'ACCOUNT_DEACTIVATED' }, { status: 403 }))
    const first = renderRoute('/login')
    await fillLogin('anna@mail.it', 'Password123!')
    expect(await screen.findByRole('alert')).toHaveTextContent('disattivato')
    first.unmount()

    authApi(() => HttpResponse.json({ status: 429, detail: 'Troppi tentativi' }, { status: 429, headers: { 'Retry-After': '900' } }))
    renderRoute('/login')
    await fillLogin('anna@mail.it', 'Password123!')
    expect(await screen.findByRole('alert')).toHaveTextContent('Riprova tra 15 minuti')
    expect(screen.getByRole('button', { name: /Riprova tra/ })).toBeDisabled()
  })

  it('campi vuoti: errori sotto i campi, nessuna chiamata', async () => {
    const bodies = authApi(() => HttpResponse.json(ANNA))
    renderRoute('/login')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Accedi' }))

    expect(await screen.findByText('Inserisci la tua email')).toBeInTheDocument()
    expect(screen.getByText('Inserisci la password')).toBeInTheDocument()
    expect(bodies).toEqual([])
  })
})

describe('RegisterPage', () => {
  async function fillRegister() {
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nome'), 'Anna')
    await user.type(screen.getByLabelText('Cognome'), 'Bianchi')
    await user.type(screen.getByLabelText('Email'), 'anna@mail.it')
    await user.type(screen.getByLabelText('Password'), 'Password123!')
    await user.type(screen.getByLabelText('Data di nascita'), '1998-05-14')
    return user
  }

  it('senza privacy non parte; con privacy invia i dati e va alla verifica', async () => {
    const bodies: unknown[] = []
    server.use(
      http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/api/auth/register`, async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ ...ANNA }, { status: 201 })
      }),
    )
    const { router } = renderRoute('/register')
    const user = await fillRegister()

    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    expect(await screen.findByText('Per registrarti devi accettare la privacy')).toBeInTheDocument()
    expect(bodies).toEqual([])

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Crea account' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/verify'))
    expect(bodies).toEqual([
      { email: 'anna@mail.it', password: 'Password123!', firstName: 'Anna', lastName: 'Bianchi', birthDate: '1998-05-14', privacyAccepted: true },
    ])
  })

  it('409: email gia\' registrata sotto il campo email', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/api/auth/register`, () => HttpResponse.json({ status: 409, detail: "Email gia' registrata" }, { status: 409 })),
    )
    renderRoute('/register')
    const user = await fillRegister()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Crea account' }))

    expect(await screen.findByText(/Esiste già un account/)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('VerifyPage', () => {
  it('codice giusto: conferma e va al login con l\'email gia\' compilata', async () => {
    let body: unknown = null
    server.use(
      http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/api/auth/verify`, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router } = renderRoute('/verify?email=anna%40mail.it')

    expect(await screen.findByText(/abbiamo inviato a anna@mail.it/)).toBeInTheDocument()
    await userEvent.setup().type(screen.getByLabelText('Codice di verifica'), '482913')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Conferma email' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(body).toEqual({ email: 'anna@mail.it', code: '482913' })
    expect(await screen.findByLabelText('Email')).toHaveValue('anna@mail.it')
  })

  it('codice sbagliato: messaggio del backend sotto il codice', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/api/auth/verify`, () => HttpResponse.json({ status: 400, detail: 'Codice non valido o scaduto' }, { status: 400 })),
    )
    renderRoute('/verify?email=anna%40mail.it')
    await userEvent.setup().type(await screen.findByLabelText('Codice di verifica'), '111111')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Conferma email' }))

    expect(await screen.findByText('Codice non valido o scaduto')).toBeInTheDocument()
  })

  it('reinvio del codice con attesa prima del successivo', async () => {
    let resent: unknown = null
    server.use(
      http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/api/auth/resend-code`, async ({ request }) => {
        resent = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/verify?email=anna%40mail.it')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Invia un nuovo codice' }))

    expect(await screen.findByRole('button', { name: /Nuovo codice tra/ })).toBeDisabled()
    expect(resent).toEqual({ email: 'anna@mail.it' })
  })
})

describe('safeReturnPath', () => {
  it('accetta solo percorsi interni', () => {
    expect(safeReturnPath({ from: '/me/tickets?x=1' })).toBe('/me/tickets?x=1')
    expect(safeReturnPath({ from: '//sito-malevolo.com' })).toBe('/')
    expect(safeReturnPath({ from: 'https://sito-malevolo.com' })).toBe('/')
    expect(safeReturnPath(null)).toBe('/')
  })
})
