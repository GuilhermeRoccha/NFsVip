// Regras de calendário e de prazo do processo.
// Regra atual (do fluxograma): chamados são abertos às quintas e o pagamento
// acontece nas quintas das 3 primeiras semanas do mês (dia 1 a 21).
// Ainda a confirmar com o Comercial; se mudar, mude só aqui e nos testes.

import { estaAberta, etapaAtual, indiceEtapa, proximaEtapa } from './etapas'
import type { Nota } from './tipos'

export const DIA_MS = 864e5
const QUINTA = 4
const ULTIMO_DIA_DE_PAGAMENTO = 21

export function inicioDoDia(d: Date | string): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function somarDias(d: Date, dias: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + dias)
  return r
}

/** Primeira quinta-feira no dia informado ou depois dele. */
export function quintaNoOuApos(d: Date): Date {
  let r = inicioDoDia(d)
  while (r.getDay() !== QUINTA) r = somarDias(r, 1)
  return r
}

/** Próximo dia de pagamento (quinta das 3 primeiras semanas) no dia informado ou depois. */
export function pagamentoNoOuApos(d: Date): Date {
  let r = quintaNoOuApos(d)
  while (r.getDate() > ULTIMO_DIA_DE_PAGAMENTO) r = quintaNoOuApos(somarDias(r, 1))
  return r
}

export const ehDiaDeChamado = (d: Date) => d.getDay() === QUINTA

export const ehDiaDePagamento = (d: Date) => +inicioDoDia(d) === +pagamentoNoOuApos(d)

export interface Janela {
  hoje: Date
  proximoChamado: Date
  proximoPagamento: Date
  pagamentoSeguinte: Date
}

export function calcularJanela(agora: Date): Janela {
  const hoje = inicioDoDia(agora)
  const proximoPagamento = pagamentoNoOuApos(hoje)
  return {
    hoje,
    proximoChamado: quintaNoOuApos(hoje),
    proximoPagamento,
    pagamentoSeguinte: pagamentoNoOuApos(somarDias(proximoPagamento, 1)),
  }
}

/** Vence antes do pagamento seguinte e ainda não tem chamado: precisa entrar na próxima janela. */
export function precisaEntrarNaJanela(n: Nota, j: Janela): boolean {
  return (
    estaAberta(n) &&
    new Date(n.vencimento) < j.pagamentoSeguinte &&
    indiceEtapa(etapaAtual(n).etapa) < indiceEtapa('chamado')
  )
}

export const estaVencida = (n: Nota, j: Janela) => estaAberta(n) && new Date(n.vencimento) < j.hoje

/** Por que a nota não pode avançar agora; undefined quando pode. */
export function bloqueioParaAvancar(n: Nota): string | undefined {
  const prox = proximaEtapa(n)
  if (!prox) return 'O fluxo desta nota já terminou.'
  if (n.pendencia) return 'Resolva a pendência antes de avançar.'
  if (prox.campoObrigatorio && !n[prox.campoObrigatorio].trim())
    return `Preencha “${prox.rotuloCampo}” para avançar para “${prox.nome}”.`
  return undefined
}

/** Aviso (não bloqueia) quando a etapa seguinte está fora do dia previsto. */
export function avisoDeCalendario(n: Nota, agora: Date): string | undefined {
  const prox = proximaEtapa(n)
  if (prox?.id === 'chamado' && !ehDiaDeChamado(agora))
    return 'Chamados só podem ser abertos na quinta-feira.'
  if (prox?.id === 'paga' && !ehDiaDePagamento(agora)) return 'Hoje não é dia de pagamento.'
  return undefined
}
