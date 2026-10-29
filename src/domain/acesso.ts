// Quem vê o quê. A tela usa isto para montar o menu; o banco (supabase/schema.sql)
// aplica as mesmas regras, então esconder um botão nunca é a única proteção.

import type { Ambiente, Perfil } from './tipos'

export type Aba = 'enviar' | 'fila' | 'requisicoes' | 'notas' | 'painel' | 'cadastros'

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  vip: 'Sala VIP',
  comercial: 'Comercial (admin)',
  gestao: 'Gestão',
}

export const NOME_DO_AMBIENTE: Record<Ambiente, string> = {
  vip: 'Notas Sala VIP',
  comercial: 'Notas Comercial',
}

interface DefAba {
  id: Aba
  nome: string
  perfis: Perfil[]
}

const ABAS: Record<Ambiente, DefAba[]> = {
  vip: [
    { id: 'enviar', nome: 'Enviar nota', perfis: ['vip', 'comercial'] },
    { id: 'fila', nome: 'Fila de notas', perfis: ['comercial'] },
    { id: 'painel', nome: 'Painel', perfis: ['comercial', 'gestao'] },
    { id: 'cadastros', nome: 'Cadastros', perfis: ['comercial'] },
  ],
  comercial: [
    { id: 'requisicoes', nome: 'Requisições', perfis: ['comercial'] },
    { id: 'notas', nome: 'Notas', perfis: ['comercial'] },
    { id: 'painel', nome: 'Painel', perfis: ['comercial', 'gestao'] },
    { id: 'cadastros', nome: 'Cadastros', perfis: ['comercial'] },
  ],
}

/** Sala VIP só vê o ambiente da Sala VIP. Comercial e Gestão veem os dois. */
export const ambientesDoPerfil = (p: Perfil): Ambiente[] => (p === 'vip' ? ['vip'] : ['vip', 'comercial'])

export const abasDoPerfil = (p: Perfil, a: Ambiente): DefAba[] =>
  ambientesDoPerfil(p).includes(a) ? ABAS[a].filter((x) => x.perfis.includes(p)) : []

/** Só o Comercial altera dados de cadastro, requisições e acessos. */
export const ehAdmin = (p: Perfil) => p === 'comercial'

/** E-mail como o login guarda: sem espaços e em minúsculas. */
export const normalizarEmail = (e: string) => e.trim().toLowerCase()

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(e))
