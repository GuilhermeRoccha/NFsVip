// Aba Úteis: consulta rápida que ficava na aba "Úteis" da planilha
// (centros de custo, códigos de aprovador, serviços recorrentes, orientações).

import type { Ambiente, SecaoUtil } from './tipos'

export interface DefSecao {
  id: SecaoUtil
  nome: string
  /** Rótulo de cada campo nesta seção: título, valor e observação. */
  colunas: [titulo: string, valor: string, obs: string]
  /** Orientações têm texto longo, sem observação. */
  texto?: boolean
}

const CENTROS: DefSecao = { id: 'centros', nome: 'Centros de custo', colunas: ['Área', 'Centro de custo', 'Observação'] }
const ORIENTACOES: DefSecao = { id: 'orientacoes', nome: 'Orientações', colunas: ['Assunto', 'Como fazer', ''], texto: true }

export const SECOES: Record<Ambiente, DefSecao[]> = {
  vip: [
    CENTROS,
    { id: 'contatos', nome: 'Contatos', colunas: ['Quem', 'Contato', 'Para quê'] },
    ORIENTACOES,
  ],
  comercial: [
    CENTROS,
    { id: 'aprovadores', nome: 'Códigos de aprovador (SAP)', colunas: ['Gestor', 'Código', 'Observação'] },
    { id: 'recorrentes', nome: 'Serviços recorrentes', colunas: ['Serviço / fornecedor', 'RC · pedido', 'Condição de pagamento e renovação'] },
    ORIENTACOES,
  ],
}

/** Texto em minúsculas e sem acentos, para a busca achar "orcamento" em "Orçamento". */
export const paraBusca = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
