import { errorMessage } from './errors'
import { uploadFile, validateImageFile } from './upload'

// Coda globale degli upload (foto evento, locandine, avatar). Vive fuori da React:
// se l'utente cambia pagina gli upload continuano, e il pannello UploadTray li mostra ovunque.
// Lo stato e' immutabile (nuovo array a ogni cambio) per useSyncExternalStore.

export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'canceled'

export type UploadTarget =
  | { kind: 'event-image'; eventId: string }
  | { kind: 'poster'; eventId: string; artistId: string }
  | { kind: 'avatar' }

export interface UploadItem {
  readonly id: string
  readonly file: File
  readonly label: string
  /** Anteprima locale (object URL) mostrata subito, prima della risposta del server. */
  readonly previewUrl: string
  readonly target: UploadTarget
  readonly status: UploadStatus
  readonly progress: number
  readonly error: string | null
  /** Parte solo quando questo upload e' finito (la copertina deve arrivare per prima). */
  readonly waitFor: string | null
}

export interface EnqueueOptions {
  /** Quanti file si possono ancora accettare (es. 10 foto per evento meno quelle presenti). */
  maxItems?: number
  /** L'evento non ha foto: il primo file diventa la copertina, quindi parte da solo. */
  coverFirst?: boolean
}

export interface EnqueueResult {
  accepted: readonly string[]
  rejected: ReadonlyArray<{ fileName: string; reason: string }>
  /** Si risolve quando ogni file del lotto e' finito (riuscito, fallito o annullato). */
  settled: Promise<PromiseSettledResult<unknown>[]>
}

type CompleteHandler = (target: UploadTarget, result: unknown) => void
type Listener = () => void

const MAX_PARALLEL = 3
// Gli upload riusciti restano visibili un momento nel pannello, poi spariscono da soli.
const DONE_VISIBLE_MS = 4000
const TERMINAL: ReadonlySet<UploadStatus> = new Set(['done', 'error', 'canceled'])
const ACTIVE: ReadonlySet<UploadStatus> = new Set(['uploading', 'processing'])

function pathFor(target: UploadTarget): string {
  if (target.kind === 'event-image') {
    return `/api/events/${encodeURIComponent(target.eventId)}/images`
  }
  if (target.kind === 'poster') {
    return `/api/events/${encodeURIComponent(target.eventId)}/lineup/${encodeURIComponent(target.artistId)}/poster`
  }
  return '/api/me/avatar'
}

interface Deferred {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

export class UploadManager {
  private items: readonly UploadItem[] = []
  private readonly listeners = new Set<Listener>()
  private readonly controllers = new Map<string, AbortController>()
  private readonly outcomes = new Map<string, Deferred>()
  private onComplete: CompleteHandler = () => {}
  // true durante cancelAll: non si avviano nuovi upload mentre si svuota la coda.
  private stopping = false

  /** Cosa fare quando un file e' caricato (l'app invalida le query dell'evento o del profilo). */
  setCompleteHandler(handler: CompleteHandler): void {
    this.onComplete = handler
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): readonly UploadItem[] => this.items

  enqueue(files: readonly File[], target: UploadTarget, options: EnqueueOptions = {}): EnqueueResult {
    const accepted: string[] = []
    const rejected: Array<{ fileName: string; reason: string }> = []
    const promises: Array<Promise<unknown>> = []
    const newItems: UploadItem[] = []
    let limit = Number.POSITIVE_INFINITY
    if (options.maxItems !== undefined) {
      limit = Math.max(options.maxItems, 0)
    }

    for (const file of files) {
      const reason = validateImageFile(file)
      if (reason !== null) {
        rejected.push({ fileName: file.name, reason })
        continue
      }
      if (accepted.length >= limit) {
        rejected.push({ fileName: file.name, reason: `${file.name}: raggiunto il numero massimo di immagini` })
        continue
      }
      const id = crypto.randomUUID()
      let waitFor: string | null = null
      if (options.coverFirst === true && accepted.length > 0) {
        waitFor = accepted[0] ?? null
      }
      accepted.push(id)
      newItems.push({
        id,
        file,
        label: file.name,
        previewUrl: URL.createObjectURL(file),
        target,
        status: 'queued',
        progress: 0,
        error: null,
        waitFor,
      })
      promises.push(
        new Promise((resolve, reject) => {
          this.outcomes.set(id, { resolve, reject })
        }),
      )
    }

    this.items = [...this.items, ...newItems]
    this.emit()
    this.pump()
    return { accepted, rejected, settled: Promise.allSettled(promises) }
  }

  retry(id: string): void {
    const item = this.find(id)
    if (item === undefined || (item.status !== 'error' && item.status !== 'canceled')) {
      return
    }
    this.update(id, { status: 'queued', progress: 0, error: null, waitFor: null })
    this.pump()
  }

  cancel(id: string): void {
    const item = this.find(id)
    if (item === undefined || TERMINAL.has(item.status)) {
      return
    }
    this.controllers.get(id)?.abort()
    this.finish(id, { status: 'canceled', error: null }, new DOMException('Annullato', 'AbortError'))
    // Se era la copertina, i file che la aspettavano ora possono partire.
    this.pump()
  }

  /** Toglie un elemento finito dal pannello e libera la sua anteprima. */
  dismiss(id: string): void {
    const item = this.find(id)
    if (item === undefined || !TERMINAL.has(item.status)) {
      return
    }
    URL.revokeObjectURL(item.previewUrl)
    this.items = this.items.filter((current) => current.id !== id)
    this.emit()
  }

  /** Logout, eliminazione account, sessione scaduta: si ferma e si svuota tutto. */
  cancelAll(): void {
    this.stopping = true
    for (const item of this.items) {
      if (!TERMINAL.has(item.status)) {
        this.cancel(item.id)
      }
    }
    for (const item of this.items) {
      URL.revokeObjectURL(item.previewUrl)
    }
    this.items = []
    this.stopping = false
    this.emit()
  }

  hasPending(): boolean {
    return this.items.some((item) => !TERMINAL.has(item.status))
  }

  private find(id: string): UploadItem | undefined {
    return this.items.find((item) => item.id === id)
  }

  private update(id: string, changes: Partial<UploadItem>): void {
    this.items = this.items.map((item) => {
      if (item.id !== id) {
        return item
      }
      return { ...item, ...changes }
    })
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private isReady(item: UploadItem): boolean {
    if (item.status !== 'queued') {
      return false
    }
    if (item.waitFor === null) {
      return true
    }
    const blocker = this.find(item.waitFor)
    return blocker === undefined || TERMINAL.has(blocker.status)
  }

  /** Avvia i file in coda finché ci sono posti liberi (massimo MAX_PARALLEL insieme). */
  private pump(): void {
    if (this.stopping) {
      return
    }
    let running = this.items.filter((item) => ACTIVE.has(item.status)).length
    for (const item of this.items) {
      if (running >= MAX_PARALLEL) {
        return
      }
      if (this.isReady(item)) {
        running += 1
        void this.start(item)
      }
    }
  }

  private async start(item: UploadItem): Promise<void> {
    const controller = new AbortController()
    this.controllers.set(item.id, controller)
    this.update(item.id, { status: 'uploading', progress: 0 })
    try {
      const result = await uploadFile<unknown>({
        path: pathFor(item.target),
        file: item.file,
        signal: controller.signal,
        onProgress: (percent) => this.update(item.id, { progress: percent }),
        onSent: () => this.update(item.id, { status: 'processing', progress: 100 }),
      })
      this.finish(item.id, { status: 'done', progress: 100 }, undefined, result)
      this.onComplete(item.target, result)
      setTimeout(() => this.dismiss(item.id), DONE_VISIBLE_MS)
    } catch (error: unknown) {
      if (this.find(item.id)?.status !== 'canceled') {
        this.finish(item.id, { status: 'error', error: errorMessage(error) }, error)
      }
    } finally {
      this.controllers.delete(item.id)
      this.pump()
    }
  }

  /** Stato finale + esito per il Promise.allSettled del lotto (solo la prima volta). */
  private finish(id: string, changes: Partial<UploadItem>, error?: unknown, result?: unknown): void {
    this.update(id, changes)
    const outcome = this.outcomes.get(id)
    if (outcome === undefined) {
      return
    }
    this.outcomes.delete(id)
    if (changes.status === 'done') {
      outcome.resolve(result)
    } else {
      outcome.reject(error)
    }
  }
}

/** Istanza unica usata dall'app. */
export const uploadManager = new UploadManager()
