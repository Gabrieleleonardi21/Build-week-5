import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { API, server } from '@/test/msw/server'

async function load() {
  vi.resetModules()
  return import('./csrf')
}

describe('csrf', () => {
  it('scarica il token una volta e lo riusa; refreshCsrf lo rilegge', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/api/auth/csrf`, () => {
        calls += 1
        return HttpResponse.json({ headerName: 'X-XSRF-TOKEN', token: `t${calls}` })
      }),
    )
    const { getCsrfToken, refreshCsrf } = await load()

    expect(await getCsrfToken()).toBe('t1')
    expect(await getCsrfToken()).toBe('t1')
    expect(await refreshCsrf()).toBe('t2')
    expect(calls).toBe(2)
  })

  it('se il download fallisce, la chiamata successiva riprova', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/api/auth/csrf`, () => {
        calls += 1
        if (calls === 1) {
          return new HttpResponse(null, { status: 503 })
        }
        return HttpResponse.json({ token: 'ok' })
      }),
    )
    const { getCsrfToken } = await load()

    await expect(getCsrfToken()).rejects.toThrow('503')
    expect(await getCsrfToken()).toBe('ok')
  })

  it('rifiuta una risposta senza token', async () => {
    server.use(http.get(`${API}/api/auth/csrf`, () => HttpResponse.json({ altro: 1 })))
    const { getCsrfToken } = await load()

    await expect(getCsrfToken()).rejects.toThrow('non valida')
  })
})
