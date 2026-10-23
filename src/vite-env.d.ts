/// <reference types="vite/client" />

// Variáveis lidas do arquivo .env.local (fora do git) ou das configurações da Vercel.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
