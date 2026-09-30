import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/errors'
import type { Role, UserResponse } from '@/lib/types'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'
import { shouldRetry } from './query-client'

function user(role: Role = 'USER'): UserResponse {
  return { id: 'u1', email: 'anna@mail.it', firstName: 'Anna', lastName: 'Bianchi', role, avatarUrl: null }
}

function loggedAs(value: UserResponse | null) {
  server.use(
    http.get(`${API}/api/auth/me`, () => {
      if (value === null) {
        return new HttpResponse(null, { status: 401 })
      }
      return HttpResponse.json(value)
    }),
  )
}

describe('guardie e layout', () => {
  it('anonimo su una pagina protetta -> login', async () => {
    loggedAs(null)
    const { router } = renderRoute('/me/tickets')

    expect(await screen.findByRole('heading', { name: 'Accedi' })).toBeInTheDocument()
    expect(router.state.location.state).toEqual({ from: '/me/tickets' })
  })

  it('utente loggato vede la pagina protetta e il suo nome nel menu', async () => {
    loggedAs(user())
    renderRoute('/me/tickets')

    expect(await screen.findByRole('heading', { name: 'I miei ticket' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Menu di Anna Bianchi' }))
    expect(await screen.findByRole('menuitem', { name: 'Profilo' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Moderazione' })).not.toBeInTheDocument()
  })

  it('area admin: USER torna alla home, MODERATOR entra', async () => {
    loggedAs(user('USER'))
    const first = renderRoute('/admin/users')
    expect(await screen.findByRole('heading', { name: 'Scopri gli eventi dal vivo in Italia' })).toBeInTheDocument()
    first.unmount()

    loggedAs(user('MODERATOR'))
    renderRoute('/admin/users')
    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Menu di Anna Bianchi' }))
    expect(await screen.findByRole('menuitem', { name: 'Moderazione' })).toBeInTheDocument()
  })

  it('chi e\' loggato non vede il login', async () => {
    loggedAs(user())
    renderRoute('/login')

    expect(await screen.findByRole('heading', { name: 'Scopri gli eventi dal vivo in Italia' })).toBeInTheDocument()
  })

  it('backend irraggiungibile: nessun redirect, proposta di riprovare', async () => {
    server.use(http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 503 })))
    renderRoute('/profile')

    expect(await screen.findByRole('alert')).toHaveTextContent('Il server non risponde')
  })

  it('rotta inesistente -> pagina non trovata', async () => {
    loggedAs(null)
    renderRoute('/non-esiste')

    expect(await screen.findByRole('heading', { name: 'Pagina non trovata' })).toBeInTheDocument()
  })

  it('logout: chiama il backend con CSRF e torna anonimi', async () => {
    let logoutHeader: string | null = null
    loggedAs(user())
    server.use(
      http.post(`${API}/api/auth/logout`, ({ request }) => {
        logoutHeader = request.headers.get('X-XSRF-TOKEN')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderRoute('/')
    const clicker = userEvent.setup()
    await clicker.click(await screen.findByRole('button', { name: 'Menu di Anna Bianchi' }))
    await clicker.click(await screen.findByRole('menuitem', { name: 'Esci' }))

    expect(await screen.findByRole('link', { name: 'Accedi' })).toBeInTheDocument()
    expect(logoutHeader).not.toBeNull()
  })
})

describe('shouldRetry', () => {
  it('riprova solo rete e 5xx, massimo 3 volte', () => {
    expect(shouldRetry(0, new ApiError(0, 'rete'))).toBe(true)
    expect(shouldRetry(1, new ApiError(503, 'giu'))).toBe(true)
    expect(shouldRetry(0, new ApiError(401, 'no'))).toBe(false)
    expect(shouldRetry(0, new ApiError(404, 'no'))).toBe(false)
    expect(shouldRetry(3, new ApiError(503, 'giu'))).toBe(false)
  })
})

describe('sessione scaduta', () => {
  it('un 401 su una chiamata autenticata riporta l\'utente ad anonimo', async () => {
    loggedAs(user())
    renderRoute('/me/tickets')
    await screen.findByRole('button', { name: 'Menu di Anna Bianchi' })

    // Simula una chiamata qualsiasi che trova la sessione scaduta.
    server.use(http.get(`${API}/api/notifications/unread-count`, () => new HttpResponse(null, { status: 401 })))
    const { api } = await import('@/lib/api')
    await expect(api('/api/notifications/unread-count')).rejects.toBeInstanceOf(ApiError)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Accedi' })).toBeInTheDocument())
  })
})
