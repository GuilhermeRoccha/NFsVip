// Quem vê o quê. A tela usa isto para montar o menu; o banco (supabase/schema.sql)
// aplica as mesmas regras, então esconder um botão nunca é a única proteção.

import type { Ambiente, Perfil } from './tipos'

export type Aba = 'enviar' | 'fila' | 'requisicoes' | 'notas' | 'painel' | 'uteis' | 'cadastros'

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  vip: 'Sala VIP',
  comercial: 'Comercial (admin)',
  operador: 'Notas Comercial',
  gestao: 'Gestão',
}

export const DESCRICAO_DO_PERFIL: Record<Perfil, string> = {
  vip: 'Só o ambiente Notas Sala VIP: envia notas e consulta os úteis',
  comercial: 'Vê e altera tudo, nos dois ambientes, e libera usuários',
  operador: 'Só o ambiente Notas Comercial: requisições, notas e úteis, sem cadastros',
  gestao: 'Só os painéis e os úteis, sem alterar nada',
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
    { id: 'uteis', nome: 'Úteis', perfis: ['vip', 'comercial', 'gestao'] },
    { id: 'cadastros', nome: 'Cadastros', perfis: ['comercial'] },
  ],
  comercial: [
    { id: 'requisicoes', nome: 'Requisições', perfis: ['comercial', 'operador'] },
    { id: 'notas', nome: 'Notas', perfis: ['comercial', 'operador'] },
    { id: 'painel', nome: 'Painel', perfis: ['comercial', 'operador', 'gestao'] },
    { id: 'uteis', nome: 'Úteis', perfis: ['comercial', 'operador', 'gestao'] },
    { id: 'cadastros', nome: 'Cadastros', perfis: ['comercial'] },
  ],
}

/** Sala VIP só vê o seu ambiente, e o operador só o Notas Comercial. Admin e Gestão veem os dois. */
export const ambientesDoPerfil = (p: Perfil): Ambiente[] =>
  p === 'vip' ? ['vip'] : p === 'operador' ? ['comercial'] : ['vip', 'comercial']

export const abasDoPerfil = (p: Perfil, a: Ambiente): DefAba[] =>
  ambientesDoPerfil(p).includes(a) ? ABAS[a].filter((x) => x.perfis.includes(p)) : []

/** Só o Comercial (admin) altera cadastros e acessos. */
export const ehAdmin = (p: Perfil) => p === 'comercial'

/** Quem mantém a aba Úteis: o admin nos dois ambientes; o operador no Notas Comercial. */
export const podeEditarUteis = (p: Perfil, a: Ambiente) => p === 'comercial' || (p === 'operador' && a === 'comercial')

/** E-mail como o login guarda: sem espaços e em minúsculas. */
export const normalizarEmail = (e: string) => e.trim().toLowerCase()

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(e))
