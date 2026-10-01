import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Backend Spring Boot in locale. Con il proxy in sviluppo FE e BE sono sulla stessa origine
// (localhost:5173): il cookie di sessione e il CSRF funzionano senza CORS.
const BACKEND = 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // Librerie caricate solo da pagine lazy (mappa, tempo reale): pre-ottimizzate all'avvio,
  // altrimenti alla prima apertura di un evento Vite le scopre e ricarica la pagina.
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet', '@stomp/stompjs'],
  },
  server: {
    proxy: {
      '/api': { target: BACKEND, changeOrigin: false },
      // STOMP su WebSocket: ws:true inoltra anche l'upgrade della connessione.
      '/ws': { target: BACKEND, ws: true, changeOrigin: false },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Librerie in file separati dal codice dell'app: a ogni deploy il browser riusa dalla cache
        // quelle che non cambiano. La mappa (Leaflet) la scarica solo chi apre una pagina con la mappa.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
            { name: 'vendor-map', test: /node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/ },
            {
              name: 'vendor-ui',
              test: /node_modules[\\/](motion|motion-dom|motion-utils|radix-ui|@radix-ui|@floating-ui|@phosphor-icons|sonner|next-themes|@tanstack)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // URL assoluto: fetch in Node non accetta percorsi relativi. MSW intercetta questo host.
    env: { VITE_API_URL: 'http://api.test' },
    css: false,
    // I test delle pagine montano l'app intera con le rotte lazy: a freddo, con la coverage attiva e sui
    // runner di GitHub (2 core) il primo supera i 5 s predefiniti. E' un tetto, non rallenta gli altri.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Generati (shadcn, tipi da openapi) e punti d'ingresso non si misurano.
      exclude: ['src/components/ui/**', 'src/lib/api-schema.ts', 'src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
    },
  },
})
