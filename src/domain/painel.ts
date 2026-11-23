// Contas do painel: comparação com o mês anterior, notas paradas e o que sai
// no próximo pagamento. As telas só chamam estas funções.

import { estaAberta, etapaAtual, recebidaEm } from './etapas'
import { DIA_MS, inicioDoDia, janelaDaNota, type Janela } from './regras'
import type { Nota } from './tipos'

/** A partir de quantos dias na mesma etapa a nota conta como parada. */
export const DIAS_PARADA = 7

export interface ResumoDoMes {
  /** Soma das NFs recebidas no mês. */
  valor: number
  /** Notas pagas no mês. */
  pagas: number
  /** % das pagas no mês que saíram até o vencimento; null quando nenhuma foi paga. */
  noPrazo: number | null
  /** Dias médios do recebimento ao pagamento das pagas no mês; null quando nenhuma foi paga. */
  ciclo: number | null
}

const doMes = (iso: string, ano: number, mes: number) => {
  const d = new Date(iso)
  return d.getFullYear() === ano && d.getMonth() === mes
}

/** Números de um mês (mes de 0 a 11), para comparar com o anterior. */
export function resumoDoMes(notas: Nota[], ano: number, mes: number): ResumoDoMes {
  const recebidas = notas.filter((n) => doMes(recebidaEm(n), ano, mes))
  const pagas = notas.filter((n) => !estaAberta(n) && doMes(etapaAtual(n).em, ano, mes))
  const noPrazo = pagas.filter((n) => inicioDoDia(etapaAtual(n).em) <= new Date(n.vencimento)).length
  const ciclo = pagas.reduce((s, n) => s + (+new Date(etapaAtual(n).em) - +new Date(recebidaEm(n))) / DIA_MS, 0)
  return {
    valor: recebidas.reduce((s, n) => s + n.valor, 0),
    pagas: pagas.length,
    noPrazo: pagas.length ? Math.round((noPrazo / pagas.length) * 100) : null,
    ciclo: pagas.length ? ciclo / pagas.length : null,
  }
}

/** Mês anterior a um mês (mes de 0 a 11). */
export const mesAnterior = (ano: number, mes: number) => (mes === 0 ? { ano: ano - 1, mes: 11 } : { ano, mes: mes - 1 })

/** Dias que a nota está na etapa atual. */
export const diasNaEtapa = (n: Nota, agora: Date) => (+agora - +new Date(etapaAtual(n).em)) / DIA_MS

/** Notas em aberto paradas há mais tempo na mesma etapa, da mais antiga para a mais nova. */
export function maisParadas(notas: Nota[], agora: Date, quantas = 5): Nota[] {
  return notas
    .filter(estaAberta)
    .sort((a, b) => diasNaEtapa(b, agora) - diasNaEtapa(a, agora))
    .slice(0, quantas)
}

/** Previsão de pagamento da nota: a que o Comercial informou ou, sem ela, a janela pelo vencimento. */
export const previsaoDaNota = (n: Nota, j: Janela): Date =>
  n.previsaoPagamento ? inicioDoDia(n.previsaoPagamento) : janelaDaNota(n, j)

/** Notas em aberto com pagamento previsto para o próximo dia de pagamento. */
export const saemNoProximoPagamento = (notas: Nota[], j: Janela) =>
  notas.filter((n) => estaAberta(n) && +previsaoDaNota(n, j) === +j.proximoPagamento)
