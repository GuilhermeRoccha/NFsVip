// Regras do saldo dos contratos básicos.

import type { Contrato, Nota } from './tipos'

/** A partir de 80% do valor consumido, o contrato entra em alerta. */
export const LIMITE_ALERTA_CONTRATO = 0.8

export type SituacaoSaldo = 'ok' | 'alerta' | 'estourado'

/** Soma das NFs lançadas com o número deste contrato. */
export const consumoDoContrato = (c: Contrato, notas: Nota[]) =>
  notas.filter((n) => n.contrato === c.numero).reduce((s, n) => s + n.valor, 0)

export function situacaoDoSaldo(usado: number, valor: number): SituacaoSaldo {
  const p = valor > 0 ? usado / valor : 0
  if (p > 1) return 'estourado'
  if (p >= LIMITE_ALERTA_CONTRATO) return 'alerta'
  return 'ok'
}
