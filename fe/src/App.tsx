import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
