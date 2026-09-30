import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeXhr } from '@/test/fake-xhr'
import { CSRF_TOKEN } from '@/test/msw/server'
import { MAX_IMAGE_BYTES, uploadFile, validateImageFile } from './upload'

function image(name = 'foto.jpg', size = 1000, type = 'image/jpeg'): File {
  return new File([new Uint8Array(size)], name, { type })
}

async function nextXhr(count: number): Promise<FakeXhr> {
  await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(count))
  return FakeXhr.last()
}

beforeEach(() => {
  FakeXhr.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
})
afterEach(() => vi.unstubAllGlobals())

describe('validateImageFile', () => {
  it('accetta JPEG/PNG/WebP fino a 5 MB', () => {
    expect(validateImageFile(image('a.png', 10, 'image/png'))).toBeNull()
    expect(validateImageFile(image('a.webp', MAX_IMAGE_BYTES, 'image/webp'))).toBeNull()
  })

  it('rifiuta formato, file vuoto e dimensione', () => {
    expect(validateImageFile(image('a.svg', 10, 'image/svg+xml'))).toContain('formati ammessi')
    expect(validateImageFile(image('vuoto.jpg', 0))).toContain('vuoto')
    expect(validateImageFile(image('grande.jpg', MAX_IMAGE_BYTES + 1))).toContain('5 MB')
  })
})

describe('uploadFile', () => {
  it('invia multipart con cookie, CSRF e progresso, poi restituisce il JSON', async () => {
    const onProgress = vi.fn()
    const onSent = vi.fn()
    const promise = uploadFile<{ url: string }>({ path: '/api/me/avatar', file: image(), onProgress, onSent })
    const xhr = await nextXhr(1)

    xhr.progress(50, 100)
    xhr.respond(200, { url: 'https://img/1' })

    await expect(promise).resolves.toEqual({ url: 'https://img/1' })
    expect(xhr.url).toBe('http://api.test/api/me/avatar')
    expect(xhr.withCredentials).toBe(true)
    expect(xhr.requestHeaders['X-XSRF-TOKEN']).toBe(CSRF_TOKEN)
    expect(xhr.body?.get('file')).toBeInstanceOf(File)
    expect(onProgress).toHaveBeenCalledWith(50)
    expect(onSent).toHaveBeenCalled()
  })

  it('errore del backend -> ApiError con il detail', async () => {
    const promise = uploadFile({ path: '/api/events/1/images', file: image() })
    const xhr = await nextXhr(1)

    xhr.respond(400, { status: 400, detail: 'Massimo 10 immagini per evento' })

    await expect(promise).rejects.toMatchObject({ status: 400, message: 'Massimo 10 immagini per evento' })
  })

  it('403 del filtro CSRF: nuovo token e un secondo invio', async () => {
    const promise = uploadFile<{ ok: boolean }>({ path: '/api/me/avatar', file: image() })
    const first = await nextXhr(1)
    first.respond(403, { status: 403, error: 'Forbidden' })
    const second = await nextXhr(2)
    second.respond(200, { ok: true })

    await expect(promise).resolves.toEqual({ ok: true })
  })

  it('annullamento e connessione persa', async () => {
    const controller = new AbortController()
    const aborted = uploadFile({ path: '/api/me/avatar', file: image(), signal: controller.signal })
    const xhr = await nextXhr(1)
    controller.abort()
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })
    expect(xhr.aborted).toBe(true)

    const lost = uploadFile({ path: '/api/me/avatar', file: image() })
    const xhr2 = await nextXhr(2)
    xhr2.failNetwork()
    await expect(lost).rejects.toMatchObject({ status: 0 })
  })
})
