import { describe, expect, it } from 'vitest'
import { diasNaEtapa, maisParadas, mesAnterior, resumoDoMes, saemNoProximoPagamento } from './painel'
import { calcularJanela } from './regras'
import type { EtapaId, Nota } from './tipos'

const d = (s: string) => new Date(s + 'T12:00:00')

/** Nota com as etapas dadas como [etapa, data]. */
const nota = (id: string, etapas: [EtapaId, string][], vencimento = '2026-12-31', valor = 100, previsao = ''): Nota => ({
  id,
  origem: 'vip',
  requisicaoId: '',
  fornecedorId: 'f1',
  numero: id,
  valor,
  emissao: d('2026-10-01').toISOString(),
  vencimento: d(vencimento).toISOString(),
  contrato: '',
  centroCusto: '',
  oc: '',
  folha: '',
  chamado: '',
  pendencia: '',
  previsaoPagamento: previsao ? d(previsao).toISOString() : '',
  arquivoNome: '',
  etapas: etapas.map(([etapa, em]) => ({ etapa, em: d(em).toISOString(), por: 'x' })),
  alteracoes: [],
})

describe('resumo do mês', () => {
  const notas = [
    nota('a', [['recebida', '2026-11-02'], ['paga', '2026-11-12']], '2026-11-30', 300),
    nota('b', [['recebida', '2026-11-03'], ['paga', '2026-11-19']], '2026-11-10', 200),
    nota('c', [['recebida', '2026-10-20']], '2026-12-31', 50),
  ]

  it('soma o recebido, conta as pagas no prazo e calcula o ciclo', () => {
    const r = resumoDoMes(notas, 2026, 10)
    expect(r.valor).toBe(500)
    expect(r.pagas).toBe(2)
    expect(r.noPrazo).toBe(50) // b foi paga depois do vencimento
    expect(r.ciclo).toBe(13) // (10 + 16) / 2
  })

  it('deixa prazo e ciclo vazios quando nada foi pago no mês', () => {
    expect(resumoDoMes(notas, 2026, 9)).toEqual({ valor: 50, pagas: 0, noPrazo: null, ciclo: null })
  })

  it('volta para dezembro do ano anterior a partir de janeiro', () => {
    expect(mesAnterior(2026, 0)).toEqual({ ano: 2025, mes: 11 })
    expect(mesAnterior(2026, 5)).toEqual({ ano: 2026, mes: 4 })
  })
})

describe('notas paradas e próximo pagamento', () => {
  const agora = d('2026-11-23')

  it('ordena as abertas pela mais parada e ignora as pagas', () => {
    const notas = [
      nota('nova', [['recebida', '2026-11-22']]),
      nota('velha', [['recebida', '2026-11-01'], ['oc', '2026-11-13']]),
      nota('paga', [['recebida', '2026-10-01'], ['paga', '2026-10-08']]),
    ]
    expect(maisParadas(notas, agora).map((n) => n.id)).toEqual(['velha', 'nova'])
    expect(diasNaEtapa(notas[1], agora)).toBe(10)
  })

  it('usa a previsão do Comercial e, sem ela, a janela pelo vencimento', () => {
    const j = calcularJanela(agora) // próximo pagamento: 03/12
    const notas = [
      nota('pelo-vencimento', [['recebida', '2026-11-20']], '2026-12-05'),
      nota('informada', [['recebida', '2026-11-20']], '2026-12-31', 100, '2026-12-03'),
      nota('depois', [['recebida', '2026-11-20']], '2026-12-31'),
    ]
    expect(saemNoProximoPagamento(notas, j).map((n) => n.id)).toEqual(['pelo-vencimento', 'informada'])
  })
})
