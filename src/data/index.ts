import { createClient } from '@supabase/supabase-js'
import type { Armazenamento } from './armazenamento'
import { ArmazenamentoLocal } from './armazenamentoLocal'
import { ArmazenamentoSupabase } from './armazenamentoSupabase'

// Ponto único onde se escolhe onde os dados ficam.
// Com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY configuradas: Supabase, com login.
// Sem elas: modo demonstração, tudo no navegador.
const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Cliente do Supabase, ou null no modo demonstração. */
export const supabase = url && chave ? createClient(url, chave) : null

export const MODO_DEMONSTRACAO = supabase === null

export const armazenamento: Armazenamento = supabase ? new ArmazenamentoSupabase(supabase) : new ArmazenamentoLocal()

export { ErroDeRegra } from './armazenamento'
export type { Dados } from './armazenamento'
