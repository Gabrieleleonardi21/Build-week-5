import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode resta attivo: in sviluppo monta due volte i componenti e fa emergere
// effetti senza cleanup (connessione STOMP, anteprime degli upload).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
