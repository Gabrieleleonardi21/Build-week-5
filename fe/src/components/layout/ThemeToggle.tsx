import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

/** Passa da chiaro a scuro; il primo avvio segue il tema del sistema. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  let label = 'Passa al tema scuro'
  let icon = <MoonIcon aria-hidden="true" />
  let next = 'dark'
  if (isDark) {
    label = 'Passa al tema chiaro'
    icon = <SunIcon aria-hidden="true" />
    next = 'light'
  }
  return (
    <Button variant="ghost" size="icon-lg" className="pointer-coarse:size-11" aria-label={label} title={label} onClick={() => setTheme(next)}>
      {icon}
    </Button>
  )
}
