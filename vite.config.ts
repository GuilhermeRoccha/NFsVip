import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' faz o build funcionar em qualquer pasta ou endereço (Vercel, prévia, arquivo local).
export default defineConfig({
  base: './',
  plugins: [react()],
})
