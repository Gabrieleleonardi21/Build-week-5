import { Outlet } from 'react-router'
import { RealtimeProvider } from '@/components/realtime/RealtimeProvider'
import { UploadTray } from '@/components/uploads/UploadTray'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

/** Guscio di tutte le pagine: intestazione, contenuto e pannello degli upload sempre visibile. */
export function AppLayout() {
  return (
    // Tempo reale per chi e' loggato: notifiche e chat arrivano su qualunque pagina.
    <RealtimeProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:shadow"
        >
          Vai al contenuto
        </a>
        <SiteHeader />
        {/* id per il link "Vai al contenuto" (tastiera e screen reader saltano l'header). */}
        <main id="contenuto" className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
        <UploadTray />
      </div>
    </RealtimeProvider>
  )
}
