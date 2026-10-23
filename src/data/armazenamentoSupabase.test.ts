import { describe, expect, it } from 'vitest'
import { caminhoDoArquivo, colunasDaNota, notaDaLinha, type LinhaNota } from './armazenamentoSupabase'

const linha: LinhaNota = {
  id: 'n1',
  fornecedor_id: 'f1',
  numero: '123',
  valor: '1234.50', // numeric pode chegar como texto
  emissao: '2026-10-01',
  vencimento: '2026-11-03',
  contrato: '4600000398',
  centro_custo: '306.002',
  oc: '',
  folha: '',
  chamado: '',
  pendencia: '',
  arquivo_nome: 'NF 123.pdf',
  arquivo_caminho: '2026/10/n1-NF_123.pdf',
  nota_etapas: [
    { id: 9, etapa: 'conferida', em: '2026-10-02T13:00:00Z', por: 'Guilherme' },
    { id: 3, etapa: 'recebida', em: '2026-10-01T12:00:00Z', por: 'Ana' },
  ],
  nota_alteracoes: [],
}

describe('conversão entre o banco e o portal', () => {
  it('converte a linha do banco numa nota, com as etapas em ordem', () => {
    const n = notaDaLinha(linha)
    expect(n.valor).toBe(1234.5)
    expect(n.centroCusto).toBe('306.002')
    expect(n.etapas.map((e) => e.etapa)).toEqual(['recebida', 'conferida'])
    expect(new Date(n.vencimento).getDate()).toBe(3) // data sem pular dia por fuso
  })

  it('converte só os campos alterados para colunas do banco', () => {
    const n = notaDaLinha(linha)
    expect(colunasDaNota({ oc: '470', centroCusto: '306.004', vencimento: n.vencimento })).toEqual({
      oc: '470',
      centro_custo: '306.004',
      vencimento: '2026-11-03',
    })
  })

  it('monta o caminho do arquivo por ano e mês, sem acentos nem espaços', () => {
    expect(caminhoDoArquivo('abc', 'Nota Fiscal Água.pdf', new Date(2026, 9, 23))).toBe('2026/10/abc-Nota_Fiscal_Agua.pdf')
  })
})
