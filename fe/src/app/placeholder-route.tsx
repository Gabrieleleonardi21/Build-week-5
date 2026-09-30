import type { RouteObject } from 'react-router'
import { PlaceholderPage } from '@/components/feedback/PlaceholderPage'

/** Rotta con pagina provvisoria: chi sviluppa la feature la sostituisce con la pagina vera (lazy). */
export function placeholderRoute(path: string, title: string, description: string): RouteObject {
  return { path, element: <PlaceholderPage title={title} description={description} /> }
}
