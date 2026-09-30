// Ambiente Node: FormData/Blob nativi, compatibili con fetch (quelli di jsdom non lo sono).
// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API, CSRF_TOKEN, server } from '@/test/msw/server'

// Moduli ricaricati a ogni test: il token CSRF in memoria non passa da un test all'altro.
async function load() {
  vi.resetModules()
  return import('./api')
}

describe('api', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('GET senza header CSRF, con cookie, e JSON restituito', async () => {
    let csrfHeader: string | null = 'non letto'
    let credentials: RequestCredentials | undefined
    server.use(
      http.get(`${API}/api/events`, ({ request }) => {
        csrfHeader = request.headers.get('X-XSRF-TOKEN')
        credentials = request.credentials
        return HttpResponse.json({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } })
      }),
    )
    const { api } = await load()

    const page = await api<{ content: unknown[] }>('/api/events')

    expect(page.content).toEqual([])
    expect(csrfHeader).toBeNull()
    expect(credentials).toBe('include')
  })

  it('POST con JSON e header X-XSRF-TOKEN; 204 -> undefined', async () => {
    let received: unknown = null
    let header: string | null = null
    server.use(
      http.post(`${API}/api/events/1/cancel`, async ({ request }) => {
        header = request.headers.get('X-XSRF-TOKEN')
        received = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { api } = await load()

    const result = await api('/api/events/1/cancel', { method: 'POST', body: { motivo: 'pioggia' } })

    expect(result).toBeUndefined()
    expect(header).toBe(CSRF_TOKEN)
    expect(received).toEqual({ motivo: 'pioggia' })
  })

  it('FormData senza Content-Type JSON (lo imposta il browser col boundary)', async () => {
    let contentType: string | null = null
    server.use(
      http.post(`${API}/api/me/avatar`, ({ request }) => {
        contentType = request.headers.get('Content-Type')
        return HttpResponse.json({ ok: true })
      }),
    )
    const { api } = await load()
    const form = new FormData()
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'a.png')

    await api('/api/me/avatar', { method: 'POST', body: form })

    expect(contentType).toMatch(/^multipart\/form-data/)
  })

  it('403 senza detail (filtro CSRF): rilegge il token e riprova una sola volta', async () => {
    let attempts = 0
    let csrfCalls = 0
    server.use(
      http.get(`${API}/api/auth/csrf`, () => {
        csrfCalls += 1
        return HttpResponse.json({ headerName: 'X-XSRF-TOKEN', token: `t${csrfCalls}` })
      }),
      http.post(`${API}/api/friendships`, ({ request }) => {
        attempts += 1
        if (request.headers.get('X-XSRF-TOKEN') === 't1') {
          return HttpResponse.json({ status: 403, error: 'Forbidden' }, { status: 403 })
        }
        return HttpResponse.json({ id: 'f1' }, { status: 201 })
      }),
    )
    const { api } = await load()

    const result = await api<{ id: string }>('/api/friendships', { method: 'POST', body: {} })

    expect(result.id).toBe('f1')
    expect(attempts).toBe(2)
    expect(csrfCalls).toBe(2)
  })

  it('403 applicativo (con detail): nessun nuovo tentativo, errore con il messaggio del backend', async () => {
    let attempts = 0
    server.use(
      http.put(`${API}/api/events/1`, () => {
        attempts += 1
        return HttpResponse.json({ status: 403, detail: 'Operazione non consentita' }, { status: 403 })
      }),
    )
    const { api } = await load()

    await expect(api('/api/events/1', { method: 'PUT', body: {} })).rejects.toMatchObject({
      status: 403,
      message: 'Operazione non consentita',
    })
    expect(attempts).toBe(1)
  })

  it('401 chiama il gestore della sessione, tranne con session: false', async () => {
    server.use(http.get(`${API}/api/auth/me`, () => new HttpResponse(null, { status: 401 })))
    const { api, setUnauthorizedHandler } = await load()
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(api('/api/auth/me', { session: false })).rejects.toMatchObject({ status: 401 })
    expect(handler).not.toHaveBeenCalled()
    await expect(api('/api/auth/me')).rejects.toMatchObject({ status: 401 })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('errore di rete -> ApiError con status 0', async () => {
    server.use(http.get(`${API}/api/events`, () => HttpResponse.error()))
    const { api } = await load()

    await expect(api('/api/events')).rejects.toMatchObject({ status: 0 })
  })

  it('429 con Retry-After letto dagli header', async () => {
    server.use(
      http.post(`${API}/api/auth/login`, () =>
        HttpResponse.json({ status: 429, detail: 'Troppi tentativi' }, { status: 429, headers: { 'Retry-After': '900' } }),
      ),
    )
    const { api } = await load()

    await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 900,
    })
  })
})
