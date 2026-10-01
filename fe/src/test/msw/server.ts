import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Backend finto per i test. Ogni test aggiunge i suoi handler con server.use(...).
export const API = 'http://api.test'
export const CSRF_TOKEN = 'token-di-prova'

export const EMPTY_PAGE = { content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } }

export const server = setupServer(
  http.get(`${API}/api/auth/csrf`, () => HttpResponse.json({ headerName: 'X-XSRF-TOKEN', token: CSRF_TOKEN })),
  // La home carica sempre la lista eventi: di default e' vuota, i test che servono la sovrascrivono.
  http.get(`${API}/api/events`, () => HttpResponse.json(EMPTY_PAGE)),
  // L'header di chi e' loggato mostra il contatore delle notifiche: di default zero.
  http.get(`${API}/api/notifications/unread-count`, () => HttpResponse.json({ unread: 0 })),
)
