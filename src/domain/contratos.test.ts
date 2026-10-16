import { describe, expect, it } from 'vitest'
import { situacaoDoSaldo } from './contratos'

describe('saldo do contrato básico', () => {
  it('entra em alerta a partir de 80% consumido', () => {
    expect(situacaoDoSaldo(79_999, 100_000)).toBe('ok')
    expect(situacaoDoSaldo(80_000, 100_000)).toBe('alerta')
    expect(situacaoDoSaldo(100_000, 100_000)).toBe('alerta')
  })

  it('marca estourado acima de 100%', () => {
    expect(situacaoDoSaldo(100_001, 100_000)).toBe('estourado')
  })
})
