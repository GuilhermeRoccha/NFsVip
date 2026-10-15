import type { EtapaId, Nota } from './tipos'

export interface Etapa {
  id: EtapaId
  nome: string
  responsavel: string
  /** Campo da nota que precisa estar preenchido para entrar nesta etapa. */
  campoObrigatorio?: 'oc' | 'folha' | 'chamado'
  rotuloCampo?: string
}

// Fluxo definido a partir do fluxograma da Sala VIP.
export const ETAPAS: Etapa[] = [
  { id: 'recebida', nome: 'Recebida', responsavel: 'Sala VIP' },
  { id: 'conferida', nome: 'Conferida', responsavel: 'Comercial' },
  { id: 'oc', nome: 'OC emitida', responsavel: 'Compras', campoObrigatorio: 'oc', rotuloCampo: 'Nº da OC' },
  { id: 'migo', nome: 'MIGO/Folha', responsavel: 'Comercial', campoObrigatorio: 'folha', rotuloCampo: 'Nº MIGO/Folha' },
  { id: 'acordo', nome: 'De acordo', responsavel: 'Coordenação SV' },
  { id: 'chamado', nome: 'Chamado aberto', responsavel: 'Comercial → Fiscal', campoObrigatorio: 'chamado', rotuloCampo: 'Nº do chamado' },
  { id: 'paga', nome: 'Paga', responsavel: 'Financeiro' },
]

export const indiceEtapa = (id: EtapaId) => ETAPAS.findIndex((e) => e.id === id)

export const etapaAtual = (n: Nota) => n.etapas[n.etapas.length - 1]

export const proximaEtapa = (n: Nota): Etapa | undefined => ETAPAS[indiceEtapa(etapaAtual(n).etapa) + 1]

export const recebidaEm = (n: Nota) => n.etapas[0].em

export const estaAberta = (n: Nota) => etapaAtual(n).etapa !== 'paga'

export const nomeEtapa = (id: EtapaId) => ETAPAS[indiceEtapa(id)].nome
