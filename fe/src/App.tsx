import { IconContext } from '@phosphor-icons/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

// Una sola famiglia di icone con un solo peso in tutta l'app (skill design-taste-frontend).
const ICONS = { size: 20, weight: 'regular' } as const
import { RouterProvider } from 'react-router'
import { createQueryClient } from '@/app/query-client'
import { createAppRouter } from '@/app/router'
import { connectUploadsToCache } from '@/app/uploads'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import './App.css'

function App() {
  // Creati una volta sola per tutta la vita dell'app.
  const [queryClient] = useState(() => {
    const client = createQueryClient()
    connectUploadsToCache(client)
    return client
  })
  const [router] = useState(createAppRouter)

  return (
    // Tema chiaro/scuro con la classe .dark (token di shadcn); di default segue il sistema.
    // Il tema iniziale lo applica public/theme-init.js prima di React: lo script di next-themes
    // e' inutile in un'app solo client, e con type non eseguibile React non avvisa piu'.
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={{ type: 'application/json' }}
    >
      {/* reducedMotion="user": se il sistema chiede meno movimento, le animazioni Motion si spengono. */}
      <MotionConfig reducedMotion="user">
        <IconContext.Provider value={ICONS}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
            <Toaster richColors closeButton />
          </QueryClientProvider>
        </IconContext.Provider>
      </MotionConfig>
    </ThemeProvider>
  )
}

export default App
