import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, server } from '@/test/msw/server'
import { renderRoute } from '@/test/render'

describe('PrivacyPage', () => {
  it('e\' pubblica e spiega dati, cookie ed eliminazione dell\'account', async () => {
    server.use(http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })))
    renderRoute('/privacy')

    expect(await screen.findByRole('heading', { level: 1, name: 'Informativa sulla privacy' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quali dati raccogliamo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cookie' })).toBeInTheDocument()
    expect(screen.getByText(/L'account viene anonimizzato/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profilo' })).toHaveAttribute('href', '/profile')
  })
})
