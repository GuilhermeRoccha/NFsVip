import { describe, expect, it } from 'vitest'
import { calcularJanela, diasAteJanela, ehUrgente, janelaDaNota, pagamentoNoOuAntes, pagamentoNoOuApos, quintaNoOuApos } from './regras'
import type { EtapaId, Nota } from './tipos'

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

const nota = (vencimento: string, etapa: EtapaId = 'conferida'): Nota => ({
  id: 'n1',
  fornecedorId: 'f1',
  numero: '1',
  valor: 100,
  emissao: d('2026-10-01').toISOString(),
  vencimento: d(vencimento).toISOString(),
  contrato: '',
  centroCusto: '',
  oc: '',
  folha: '',
  chamado: '',
  pendencia: '',
  arquivoNome: '',
  etapas: [{ etapa, em: d('2026-10-02').toISOString(), por: 'Sala VIP' }],
  alteracoes: [],
})

describe('prioridade: 15 dias antes da janela de pagamento', () => {
  const j = calcularJanela(d('2026-10-16')) // sexta; próximo pagamento 05/11

  it('acha o último dia de pagamento até uma data', () => {
    expect(ymd(pagamentoNoOuAntes(d('2026-11-30')))).toBe('2026-11-19')
    expect(ymd(pagamentoNoOuAntes(d('2026-11-05')))).toBe('2026-11-05')
  })

  it('usa o último pagamento antes do vencimento como janela da nota', () => {
    expect(ymd(janelaDaNota(nota('2026-11-30'), j))).toBe('2026-11-19')
    expect(diasAteJanela(nota('2026-11-30'), j)).toBe(34)
  })

  it('manda para o próximo pagamento quando a janela já passou', () => {
    expect(ymd(janelaDaNota(nota('2026-10-20'), j))).toBe('2026-11-05')
  })

  it('marca urgente com menos de 15 dias, só antes do chamado', () => {
    expect(ehUrgente(nota('2026-11-10'), j)).toBe(false) // janela 05/11: 20 dias
    expect(ehUrgente(nota('2026-10-20'), j)).toBe(true) // perdeu a janela de 15/10: pagaria depois do vencimento
    const pertoDaJanela = calcularJanela(d('2026-10-25')) // janela 05/11: 11 dias
    expect(ehUrgente(nota('2026-11-10'), pertoDaJanela)).toBe(true)
    expect(ehUrgente(nota('2026-11-10', 'chamado'), pertoDaJanela)).toBe(false)
    expect(ehUrgente(nota('2026-11-10', 'paga'), pertoDaJanela)).toBe(false)
  })
})
