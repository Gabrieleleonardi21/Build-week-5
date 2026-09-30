import { Outlet } from 'react-router'
import { UploadTray } from '@/components/uploads/UploadTray'
import { SiteHeader } from './SiteHeader'

/** Guscio di tutte le pagine: intestazione, contenuto e pannello degli upload sempre visibile. */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <UploadTray />
    </div>
  )
}
