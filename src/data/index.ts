import type { Armazenamento } from './armazenamento'
import { ArmazenamentoLocal } from './armazenamentoLocal'

// Ponto único onde se escolhe onde os dados ficam.
// Hoje: sempre no navegador (modo demonstração).
// Futuro: se VITE_SUPABASE_URL estiver configurada, usar o Supabase.
export const armazenamento: Armazenamento = new ArmazenamentoLocal()

export const MODO_DEMONSTRACAO = true

export { ErroDeRegra } from './armazenamento'
export type { Dados } from './armazenamento'
