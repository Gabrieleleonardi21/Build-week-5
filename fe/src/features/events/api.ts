// Chiavi della cache degli eventi: le usano le pagine e l'upload manager (copertina cambiata).
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
}
