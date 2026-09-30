// Matcher di jest-dom (toBeInTheDocument, toHaveAttribute...) per tutti i test.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './msw/server'

// jsdom non ha ResizeObserver (lo usano Radix e il campo del codice): basta che esista.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub

// Le pagine lazy (import dinamico) a freddo possono superare 1 s: attesa massima 3 s (non rallenta i test veloci).
configure({ asyncUtilTimeout: 3000 })

// Una richiesta non prevista fa fallire il test: niente chiamate vere per sbaglio.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
afterAll(() => server.close())
