import type { InfiniteData } from '@tanstack/react-query'
import { act, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { chatKeys } from '@/features/chat/api'
import { friendKeys } from '@/features/friends/api'
import { notificationKeys } from '@/features/notifications/api'
import type { ChatMessageResponse, NotificationResponse, Page, UserResponse } from '@/lib/types'
import { fakeRealtime } from '@/test/fake-stomp'
import { API, server } from '@/test/msw/server'
import { createTestQueryClient, renderRoute } from '@/test/render'
import { applyChatMessage, applyNotification } from './cache-updates'

const ME: UserResponse = { id: 'u1', email: 'anna@mail.it', firstName: 'Anna', lastName: 'Bianchi', role: 'USER', avatarUrl: null }

function notification(overrides: Partial<NotificationResponse> = {}): NotificationResponse {
  return { id: 'n1', type: 'OWNER_MESSAGE', title: 'Cambio orario', body: 'Si apre alle 20', eventId: 'e1', readAt: null, createdAt: '2027-06-01T10:00:00Z', ...overrides }
}

function message(overrides: Partial<ChatMessageResponse> = {}): ChatMessageResponse {
  return { id: 'm1', friendshipId: 'f1', senderId: 'u2', content: 'Ciao!', sentAt: '2027-06-01T10:00:00Z', readAt: null, ...overrides }
}

function loggedAs(user: UserResponse | null) {
  server.use(
    http.get(`${API}/api/auth/me`, () => {
      if (user === null) {
        return new HttpResponse(null, { status: 401 })
      }
      return HttpResponse.json(user)
    }),
  )
}

describe('aggiornamenti della cache', () => {
  it('una notifica aumenta il contatore dei non letti gia\' caricato', () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(notificationKeys.unread(), { unread: 2 })

    applyNotification(queryClient, notification())

    expect(queryClient.getQueryData(notificationKeys.unread())).toEqual({ unread: 3 })
  })

  it('una richiesta di amicizia rende vecchi i dati degli amici', () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData([...friendKeys.all, 'prova'], [])

    applyNotification(queryClient, notification({ type: 'FRIEND_REQUEST', eventId: null }))

    expect(queryClient.getQueryState([...friendKeys.all, 'prova'])?.isInvalidated).toBe(true)
  })

  it('un messaggio entra in cima allo storico gia\' caricato, una volta sola', () => {
    const queryClient = createTestQueryClient()
    const history: InfiniteData<Page<ChatMessageResponse>> = {
      pages: [{ content: [message({ id: 'm0', content: 'Prima' })], page: { size: 30, number: 0, totalElements: 1, totalPages: 1 } }],
      pageParams: [0],
    }
    queryClient.setQueryData(chatKeys.messages('f1'), history)

    applyChatMessage(queryClient, message())
    applyChatMessage(queryClient, message())

    const updated = queryClient.getQueryData<InfiniteData<Page<ChatMessageResponse>>>(chatKeys.messages('f1'))
    expect(updated?.pages[0]?.content.map((item) => item.id)).toEqual(['m1', 'm0'])
  })

  it('senza storico caricato non crea nulla: lo scarichera\' la pagina quando si apre', () => {
    const queryClient = createTestQueryClient()

    applyChatMessage(queryClient, message())

    expect(queryClient.getQueryData(chatKeys.messages('f1'))).toBeUndefined()
  })
})

describe('RealtimeProvider', () => {
  it('anonimo: nessuna connessione', async () => {
    loggedAs(null)
    renderRoute('/')

    expect(await screen.findByRole('link', { name: 'Accedi' })).toBeInTheDocument()
    expect(fakeRealtime.active).toBe(0)
  })

  it('utente loggato: si collega e una notifica aggiorna subito la campanella', async () => {
    loggedAs(ME)
    renderRoute('/')

    expect(await screen.findByRole('link', { name: 'Notifiche' })).toBeInTheDocument()
    await waitFor(() => expect(fakeRealtime.active).toBe(1))

    act(() => fakeRealtime.notification(notification()))

    expect(await screen.findByRole('link', { name: 'Notifiche, 1 non letta' })).toBeInTheDocument()
  })

  it('dopo una riconnessione rilegge dal backend quello che puo\' essere arrivato nel frattempo', async () => {
    let unread = 0
    loggedAs(ME)
    server.use(http.get(`${API}/api/notifications/unread-count`, () => HttpResponse.json({ unread })))
    renderRoute('/')
    expect(await screen.findByRole('link', { name: 'Notifiche' })).toBeInTheDocument()
    await waitFor(() => expect(fakeRealtime.active).toBe(1))
    act(() => fakeRealtime.connect())

    // Due notifiche arrivano mentre il socket e' giu': nessun frame le consegna.
    act(() => fakeRealtime.disconnect())
    unread = 2
    act(() => fakeRealtime.connect())

    expect(await screen.findByRole('link', { name: 'Notifiche, 2 non lette' })).toBeInTheDocument()
  })
})
