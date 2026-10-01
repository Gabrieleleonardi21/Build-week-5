import { Link } from 'react-router'

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
        <p>Eventi dal vivo in tutta Italia.</p>
        <Link to="/privacy" className="rounded-sm underline-offset-4 hover:text-foreground hover:underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          Privacy
        </Link>
      </div>
    </footer>
  )
}
