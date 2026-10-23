import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Entrada } from './components/Entrada.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Entrada>
      <App />
    </Entrada>
  </StrictMode>,
)
