import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeXhr } from '@/test/fake-xhr'
import { UploadManager, type UploadItem } from './upload-manager'

const target = { kind: 'event-image', eventId: 'e1' } as const

function image(name: string): File {
  return new File([new Uint8Array(100)], name, { type: 'image/jpeg' })
}

function statuses(manager: UploadManager): string[] {
  return manager.getSnapshot().map((item: UploadItem) => `${item.label}:${item.status}`)
}

async function waitForXhr(count: number): Promise<void> {
  await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(count))
}

let manager: UploadManager
const revoke = vi.fn()

beforeEach(() => {
  FakeXhr.instances = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  // jsdom non implementa gli object URL delle anteprime.
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`)
  URL.revokeObjectURL = revoke
  revoke.mockClear()
  manager = new UploadManager()
})
afterEach(() => vi.unstubAllGlobals())

describe('UploadManager', () => {
  it('scarta i file non validi e quelli oltre il limite, con il motivo', () => {
    const bad = new File(['x'], 'doc.pdf', { type: 'application/pdf' })

    const result = manager.enqueue([image('a.jpg'), bad, image('b.jpg'), image('c.jpg')], target, { maxItems: 2 })

    expect(result.accepted).toHaveLength(2)
    expect(result.rejected.map((r) => r.fileName)).toEqual(['doc.pdf', 'c.jpg'])
    expect(manager.getSnapshot()[0]?.previewUrl).toBe('blob:a.jpg')
  })

  it('al massimo 3 upload insieme; quando uno finisce parte il successivo', async () => {
    manager.enqueue(['1', '2', '3', '4'].map((n) => image(`${n}.jpg`)), target)
    await waitForXhr(3)
    expect(statuses(manager)).toEqual(['1.jpg:uploading', '2.jpg:uploading', '3.jpg:uploading', '4.jpg:queued'])

    FakeXhr.instances[0]?.respond(201, { id: 'img1' })
    await waitForXhr(4)
    expect(manager.getSnapshot().find((i) => i.label === '4.jpg')?.status).toBe('uploading')
  })

  it('copertina per prima: gli altri partono solo quando il primo e\' finito', async () => {
    manager.enqueue([image('cover.jpg'), image('b.jpg'), image('c.jpg')], target, { coverFirst: true })
    await waitForXhr(1)
    expect(statuses(manager)).toEqual(['cover.jpg:uploading', 'b.jpg:queued', 'c.jpg:queued'])

    FakeXhr.instances[0]?.respond(201, { id: 'cover' })
    await waitForXhr(3)
  })

  it('un errore non blocca gli altri; settled riporta ogni esito', async () => {
    const onComplete = vi.fn()
    manager.setCompleteHandler(onComplete)
    const { settled } = manager.enqueue([image('ok.jpg'), image('ko.jpg')], target)
    await waitForXhr(2)

    FakeXhr.instances[1]?.respond(400, { status: 400, detail: 'Il file non e\' un\'immagine valida' })
    FakeXhr.instances[0]?.progress(40, 100)
    expect(manager.getSnapshot()[0]?.progress).toBe(40)
    FakeXhr.instances[0]?.respond(201, { id: 'ok' })

    const results = await settled
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected'])
    expect(statuses(manager)).toEqual(['ok.jpg:done', 'ko.jpg:error'])
    expect(manager.getSnapshot()[1]?.error).toBe("Il file non e' un'immagine valida")
    expect(onComplete).toHaveBeenCalledWith(target, { id: 'ok' })
  })

  it('processing quando il file e\' inviato ma il server sta ancora caricando su Cloudinary', async () => {
    manager.enqueue([image('a.jpg')], target)
    await waitForXhr(1)

    FakeXhr.instances[0]?.upload.onload?.(new ProgressEvent('load'))

    expect(statuses(manager)).toEqual(['a.jpg:processing'])
  })

  it('retry rimette in coda un file fallito', async () => {
    manager.enqueue([image('a.jpg')], target)
    await waitForXhr(1)
    FakeXhr.instances[0]?.failNetwork()
    await vi.waitFor(() => expect(statuses(manager)).toEqual(['a.jpg:error']))

    const id = manager.getSnapshot()[0]?.id ?? ''
    manager.retry(id)
    await waitForXhr(2)
    FakeXhr.instances[1]?.respond(201, { id: 'a' })
    await vi.waitFor(() => expect(statuses(manager)).toEqual(['a.jpg:done']))
  })

  it('cancel interrompe l\'invio; annullare la copertina sblocca gli altri', async () => {
    manager.enqueue([image('cover.jpg'), image('b.jpg')], target, { coverFirst: true })
    await waitForXhr(1)

    manager.cancel(manager.getSnapshot()[0]?.id ?? '')

    expect(FakeXhr.instances[0]?.aborted).toBe(true)
    await waitForXhr(2)
    expect(statuses(manager)).toEqual(['cover.jpg:canceled', 'b.jpg:uploading'])
  })

  it('dismiss e cancelAll liberano le anteprime; hasPending segue lo stato', async () => {
    manager.enqueue([image('a.jpg'), image('b.jpg')], target)
    await waitForXhr(2)
    expect(manager.hasPending()).toBe(true)
    FakeXhr.instances[0]?.respond(201, { id: 'a' })
    await vi.waitFor(() => expect(manager.getSnapshot()[0]?.status).toBe('done'))

    manager.dismiss(manager.getSnapshot()[0]?.id ?? '')
    expect(revoke).toHaveBeenCalledWith('blob:a.jpg')

    manager.cancelAll()
    expect(manager.getSnapshot()).toEqual([])
    expect(revoke).toHaveBeenCalledWith('blob:b.jpg')
    expect(manager.hasPending()).toBe(false)
  })

  it('gli upload riusciti spariscono dal pannello dopo qualche secondo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    manager.enqueue([image('a.jpg')], target)
    await waitForXhr(1)
    FakeXhr.instances[0]?.respond(201, { id: 'a' })
    await vi.waitFor(() => expect(manager.getSnapshot()[0]?.status).toBe('done'))

    vi.advanceTimersByTime(4000)

    expect(manager.getSnapshot()).toEqual([])
    vi.useRealTimers()
  })

  it('i listener ricevono ogni cambio; lo snapshot e\' un nuovo array (immutabile)', () => {
    const listener = vi.fn()
    const unsubscribe = manager.subscribe(listener)
    const before = manager.getSnapshot()

    manager.enqueue([image('a.jpg')], target)

    expect(listener).toHaveBeenCalled()
    expect(manager.getSnapshot()).not.toBe(before)
    unsubscribe()
  })
})
