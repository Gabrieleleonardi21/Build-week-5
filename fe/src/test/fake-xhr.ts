// XMLHttpRequest finto per i test degli upload: il test decide quando arriva il progresso,
// quando finisce l'invio e con che status risponde il server.
type Handler = ((event: ProgressEvent) => void) | null

class FakeUpload {
  onprogress: Handler = null
  onload: Handler = null
}

export class FakeXhr {
  static instances: FakeXhr[] = []

  method = ''
  url = ''
  withCredentials = false
  timeout = 0
  status = 0
  responseText = ''
  readonly requestHeaders: Record<string, string> = {}
  readonly responseHeaders: Record<string, string> = {}
  body: FormData | null = null
  aborted = false
  readonly upload = new FakeUpload()
  onload: Handler = null
  onerror: Handler = null
  ontimeout: Handler = null
  onabort: Handler = null
  onloadend: Handler = null

  constructor() {
    FakeXhr.instances.push(this)
  }

  open(method: string, url: string): void {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name] = value
  }

  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name] ?? null
  }

  send(body: FormData): void {
    this.body = body
  }

  abort(): void {
    this.aborted = true
    this.onabort?.(new ProgressEvent('abort'))
    this.onloadend?.(new ProgressEvent('loadend'))
  }

  // ---- comandi usati dai test
  progress(loaded: number, total: number): void {
    this.upload.onprogress?.(new ProgressEvent('progress', { lengthComputable: true, loaded, total }))
  }

  respond(status: number, body: unknown, headers: Record<string, string> = {}): void {
    this.upload.onload?.(new ProgressEvent('load'))
    this.status = status
    if (typeof body === 'string') {
      this.responseText = body
    } else {
      this.responseText = JSON.stringify(body)
    }
    Object.assign(this.responseHeaders, headers)
    this.onload?.(new ProgressEvent('load'))
    this.onloadend?.(new ProgressEvent('loadend'))
  }

  failNetwork(): void {
    this.onerror?.(new ProgressEvent('error'))
    this.onloadend?.(new ProgressEvent('loadend'))
  }

  static last(): FakeXhr {
    const xhr = FakeXhr.instances.at(-1)
    if (xhr === undefined) {
      throw new Error('Nessuna richiesta XHR inviata')
    }
    return xhr
  }
}
