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

/** Antecedência ideal: a nota deve estar pronta 15 dias antes da janela de pagamento. */
export const DIAS_DE_ANTECEDENCIA = 15

/** Último dia de pagamento (quinta do dia 1 ao 21) no dia informado ou antes dele. */
export function pagamentoNoOuAntes(d: Date): Date {
  let r = inicioDoDia(d)
  while (r.getDay() !== QUINTA || r.getDate() > ULTIMO_DIA_DE_PAGAMENTO) r = somarDias(r, -1)
  return r
}

/** A nota já não consegue ser paga até o vencimento: a última janela antes dele passou. */
export const perdeuAJanela = (n: Nota, j: Janela) => pagamentoNoOuAntes(new Date(n.vencimento)) < j.hoje

/**
 * Previsão de pagamento para um vencimento: o último dia de pagamento até ele.
 * Se esse dia já passou, fica para o próximo pagamento.
 */
export function previsaoDePagamento(vencimento: string | Date, j: Janela): Date {
  const ultimo = pagamentoNoOuAntes(new Date(vencimento))
  return ultimo < j.hoje ? j.proximoPagamento : ultimo
}

/** Janela de pagamento da nota (a previsão de pagamento pelo vencimento). */
export const janelaDaNota = (n: Nota, j: Janela): Date => previsaoDePagamento(n.vencimento, j)

/** Dias corridos de hoje até a janela de pagamento da nota. */
export const diasAteJanela = (n: Nota, j: Janela) => Math.round((+janelaDaNota(n, j) - +j.hoje) / DIA_MS)

/**
 * Urgente: ainda sem chamado e com menos de 15 dias até a janela de pagamento,
 * ou já sem janela antes do vencimento.
 */
export function ehUrgente(n: Nota, j: Janela): boolean {
  return (
    estaAberta(n) &&
    indiceEtapa(etapaAtual(n).etapa) < indiceEtapa('chamado') &&
    (perdeuAJanela(n, j) || diasAteJanela(n, j) < DIAS_DE_ANTECEDENCIA)
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

/** Um dia do calendário de datas do mês: se tem abertura de chamados e/ou pagamento. */
export interface DiaDoMes {
  dia: Date
  chamado: boolean
  pagamento: boolean
}

/** Todos os dias do mês (mes de 0 a 11), marcando as quintas de chamado e as de pagamento. */
export function diasDoMes(ano: number, mes: number): DiaDoMes[] {
  const dias: DiaDoMes[] = []
  for (let d = new Date(ano, mes, 1); d.getMonth() === mes; d = somarDias(d, 1)) {
    const quinta = d.getDay() === QUINTA
    dias.push({ dia: d, chamado: quinta, pagamento: quinta && d.getDate() <= ULTIMO_DIA_DE_PAGAMENTO })
  }
  return dias
}

/**
 * Aviso curto para o ícone de datas: só aparece na véspera e no dia da quinta,
 * para lembrar sem ocupar espaço. Undefined nos outros dias.
 */
export function avisoDeDatas(agora: Date): string | undefined {
  const hoje = inicioDoDia(agora)
  const amanha = somarDias(hoje, 1)
  if (ehDiaDeChamado(hoje)) return ehDiaDePagamento(hoje) ? 'Hoje tem abertura de chamados e pagamento' : 'Hoje tem abertura de chamados'
  if (ehDiaDeChamado(amanha))
    return ehDiaDePagamento(amanha) ? 'Amanhã tem abertura de chamados e pagamento' : 'Amanhã tem abertura de chamados'
  return undefined
}
