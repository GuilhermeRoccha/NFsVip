// Requisições de compra do Comercial: RC → pedido → serviço → NFs.
// Status tirados da planilha "Controle Requisições de Compra".

import { estaAberta } from './etapas'
import type { Nota, Requisicao, StatusRequisicao } from './tipos'

export interface DefStatus {
  id: StatusRequisicao
  nome: string
  /** Campo que precisa estar preenchido para entrar neste status. */
  exige?: 'rc' | 'pedido'
}

// Ordem do processo. "Cancelada" fica fora da sequência: pode acontecer a qualquer momento.
export const STATUS_REQUISICAO: DefStatus[] = [
  { id: 'rc_aberta', nome: 'RC aberta' },
  { id: 'rc_aprovada', nome: 'RC aprovada', exige: 'rc' },
  { id: 'pedido_gerado', nome: 'Pedido gerado', exige: 'pedido' },
  { id: 'pedido_aprovado', nome: 'Pedido aprovado', exige: 'pedido' },
  { id: 'em_andamento', nome: 'Serviço em andamento', exige: 'pedido' },
  { id: 'nf_solicitada', nome: 'NF solicitada', exige: 'pedido' },
  { id: 'concluida', nome: 'Concluída', exige: 'pedido' },
]

export const nomeStatus = (s: StatusRequisicao) =>
  s === 'cancelada' ? 'Cancelada' : STATUS_REQUISICAO.find((x) => x.id === s)!.nome

const indice = (s: StatusRequisicao) => STATUS_REQUISICAO.findIndex((x) => x.id === s)

export const requisicaoAberta = (r: Requisicao) => r.status !== 'concluida' && r.status !== 'cancelada'

export function proximoStatus(r: Requisicao): DefStatus | undefined {
  if (!requisicaoAberta(r)) return undefined
  return STATUS_REQUISICAO[indice(r.status) + 1]
}

const ROTULO_CAMPO = { rc: 'o nº da RC', pedido: 'o nº do pedido' }

/** Motivo para não poder ir ao status pedido, ou null se pode. */
export function bloqueioDoStatus(r: Requisicao, novo: StatusRequisicao): string | null {
  if (novo === r.status) return 'A requisição já está neste status.'
  if (novo === 'cancelada') return r.status === 'concluida' ? 'Requisição concluída não pode ser cancelada.' : null
  if (r.status === 'cancelada') return 'Requisição cancelada não muda mais de status.'
  const def = STATUS_REQUISICAO.find((x) => x.id === novo)!
  if (def.exige && !r[def.exige].trim()) return `Preencha ${ROTULO_CAMPO[def.exige]} antes de mudar para "${def.nome}".`
  return null
}

/** NFs lançadas contra a requisição. */
export const notasDaRequisicao = (r: Requisicao, notas: Nota[]) => notas.filter((n) => n.requisicaoId === r.id)

export interface Faturamento {
  /** Soma das NFs lançadas. */
  faturado: number
  /** Soma das NFs já pagas. */
  pago: number
  /** Valor do pedido que ainda não virou NF (negativo = passou do pedido). */
  saldo: number
  /** NFs ainda não pagas. */
  emAberto: number
}

export function faturamento(r: Requisicao, notas: Nota[]): Faturamento {
  const nfs = notasDaRequisicao(r, notas)
  const faturado = nfs.reduce((s, n) => s + n.valor, 0)
  const pago = nfs.filter((n) => !estaAberta(n)).reduce((s, n) => s + n.valor, 0)
  return { faturado, pago, saldo: r.valorTotal - faturado, emAberto: nfs.filter(estaAberta).length }
}

/** Requisições em que o Comercial pode lançar NF: com pedido e não canceladas. */
export const aceitaNota = (r: Requisicao) => r.status !== 'cancelada' && !!r.pedido.trim()

const ROTULOS: Partial<Record<keyof Requisicao, string>> = {
  dataRc: 'Data da RC',
  tipo: 'Tipo',
  fornecedorId: 'Fornecedor',
  projeto: 'Projeto',
  centroCusto: 'Centro de custo',
  rc: 'RC',
  pedido: 'Pedido',
  valorTotal: 'Valor total',
  condicaoPagamento: 'Condição de pagamento',
  gestor: 'Gestor',
  obs: 'Observação',
}

/** Frases do histórico para o que mudou numa edição (o status tem frase própria). */
export function descreverEdicao(antes: Requisicao, depois: Requisicao, nomeFornecedor: (id: string) => string): string[] {
  const fmt = (k: keyof Requisicao, v: unknown) =>
    k === 'fornecedorId' ? nomeFornecedor(String(v)) : k === 'dataRc' ? String(v).slice(0, 10) : String(v ?? '')
  return (Object.keys(ROTULOS) as (keyof Requisicao)[])
    .filter((k) => antes[k] !== depois[k])
    .map((k) => `${ROTULOS[k]}: ${fmt(k, antes[k]) || 'vazio'} → ${fmt(k, depois[k]) || 'vazio'}`)
}

export const descreverStatus = (de: StatusRequisicao, para: StatusRequisicao, motivo = '') =>
  `Status: ${nomeStatus(de)} → ${nomeStatus(para)}${motivo.trim() ? `. Motivo: ${motivo.trim()}` : ''}`

/** Problemas que impedem salvar a requisição, ou null. */
export function validarRequisicao(r: Requisicao): string | null {
  if (!r.fornecedorId) return 'Escolha a empresa (fornecedor).'
  if (!r.projeto.trim()) return 'Descreva o projeto ou serviço.'
  if (!(r.valorTotal > 0)) return 'Informe o valor total.'
  if (!r.dataRc) return 'Informe a data da RC.'
  return null
}

export const CONDICOES_COMUNS = [
  '30 dias após o aceite',
  '15 dias após o aceite',
  'Na entrega do serviço',
  '40% de entrada e 60% na entrega',
  'Cartão corporativo',
]

/** Requisição em branco para o formulário de nova requisição. */
export function requisicaoVazia(hoje = new Date()): Requisicao {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return {
    id: '',
    dataRc: d.toISOString(),
    tipo: 'servico',
    fornecedorId: '',
    projeto: '',
    centroCusto: '',
    rc: '',
    pedido: '',
    valorTotal: 0,
    condicaoPagamento: '',
    gestor: '',
    obs: '',
    status: 'rc_aberta',
    historico: [],
  }
}
