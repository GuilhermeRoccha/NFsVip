import { describe, expect, it } from 'vitest'
import { calcularJanela, pagamentoNoOuApos, quintaNoOuApos } from './regras'

const d = (s: string) => new Date(s + 'T12:00:00')
const ymd = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`

describe('calendário das quintas', () => {
  it('acha a quinta no próprio dia ou depois', () => {
    expect(ymd(quintaNoOuApos(d('2026-10-15')))).toBe('2026-10-15') // quinta
    expect(ymd(quintaNoOuApos(d('2026-10-16')))).toBe('2026-10-22') // sexta → próxima quinta
  })

  it('pula as quintas depois do dia 21 para o pagamento', () => {
    expect(ymd(pagamentoNoOuApos(d('2026-10-16')))).toBe('2026-11-05') // 22 e 29/10 ficam fora
    expect(ymd(pagamentoNoOuApos(d('2026-10-02')))).toBe('2026-10-08')
  })

  it('calcula a janela de hoje e a seguinte', () => {
    const j = calcularJanela(d('2026-10-13'))
    expect(ymd(j.proximoChamado)).toBe('2026-10-15')
    expect(ymd(j.proximoPagamento)).toBe('2026-10-15')
    expect(ymd(j.pagamentoSeguinte)).toBe('2026-11-05')
  })
})
