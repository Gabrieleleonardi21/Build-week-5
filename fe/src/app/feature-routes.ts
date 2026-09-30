import type { RouteObject } from 'react-router'

/**
 * Rotte di una feature, gia' divise per guardia. Ogni feature ha il suo routes.tsx
 * e app/router.tsx li mette insieme: nessuno modifica lo stesso file di routing.
 */
export interface FeatureRoutes {
  /** Visibili a tutti. */
  public?: RouteObject[]
  /** Solo per chi non e' loggato (login, registrazione). */
  guest?: RouteObject[]
  /** Serve il login. */
  auth?: RouteObject[]
  /** Serve almeno MODERATOR. */
  admin?: RouteObject[]
}
