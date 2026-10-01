// Matcher di jest-dom (toBeInTheDocument, toHaveAttribute...) per tutti i test.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { fakeRealtime } from './fake-stomp'
import { server } from './msw/server'

// Nessun WebSocket vero nei test: il layout collega il tempo reale per ogni utente loggato,
// qui riceve il client finto (i test lo comandano con fakeRealtime). lib/stomp.test.ts usa quello vero.
vi.mock('@/lib/stomp', () => import('./fake-stomp'))

// jsdom non ha ResizeObserver (lo usano Radix e il campo del codice): basta che esista.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub

// jsdom non implementa document.elementFromPoint: input-otp (campo del codice di verifica) lo chiama
// dentro un timer e, senza, genera errori non gestiti che fanno fallire Vitest in CI.
// null = "nessun elemento in quel punto", la risposta del browser fuori dalla pagina.
// Alcuni file di test girano in ambiente Node (senza document): lì questi sostituti non servono.
if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null
}

// jsdom non implementa lo scorrimento (paginazione della home, ultimo messaggio della chat):
// basta che non segnali errori.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
}

// Le pagine lazy (import dinamico) a freddo possono superare 1 s: attesa massima 5 s (non rallenta i test veloci).
configure({ asyncUtilTimeout: 5000 })

// Una richiesta non prevista fa fallire il test: niente chiamate vere per sbaglio.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
  fakeRealtime.reset()
})
afterAll(() => server.close())
