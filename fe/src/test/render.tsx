import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/router'
import { AuthProvider } from '@/components/auth/AuthProvider'

export function createTestQueryClient(): QueryClient {
  // Nei test niente nuovi tentativi: un errore deve vedersi subito.
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

/** Monta l'app vera (rotte, guardie, layout) su un percorso, con il backend finto di MSW. */
export function renderRoute(path: string): RenderResult & { router: ReturnType<typeof createMemoryRouter> } {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const result = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return { ...result, router }
}
