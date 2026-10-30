import { describe, expect, it } from 'vitest'
import { abasDoPerfil, ambientesDoPerfil, podeEditarUteis } from './acesso'
import { bloqueioDoStatus, faturamento, proximoStatus, validarRequisicao } from './requisicoes'
import type { Nota, Requisicao } from './tipos'

const req = (campos: Partial<Requisicao> = {}): Requisicao => ({
  id: 'r1',
  dataRc: '2026-10-01T03:00:00.000Z',
  tipo: 'servico',
  fornecedorId: 'f1',
  projeto: 'Adesivagem',
  centroCusto: 'BSB302.003',
  rc: '',
  pedido: '',
  valorTotal: 1000,
  condicaoPagamento: '',
  gestor: '',
  obs: '',
  status: 'rc_aberta',
  historico: [],
  ...campos,
})

const nota = (valor: number, paga: boolean, requisicaoId = 'r1'): Nota => ({
  id: String(Math.random()),
  origem: 'comercial',
  requisicaoId,
  fornecedorId: 'f1',
  numero: '1',
  valor,
  emissao: '',
  vencimento: '',
  contrato: '',
  centroCusto: '',
  oc: '',
  folha: '',
  chamado: '',
  pendencia: '',
  previsaoPagamento: '',
  arquivoNome: '',
  etapas: [{ etapa: paga ? 'paga' : 'recebida', em: '', por: '' }],
  alteracoes: [],
})

describe('requisições', () => {
  it('só avança para RC aprovada com o nº da RC', () => {
    expect(bloqueioDoStatus(req(), 'rc_aprovada')).toMatch(/RC/)
    expect(bloqueioDoStatus(req({ rc: '4500049874' }), 'rc_aprovada')).toBeNull()
  })

  it('só chega a pedido gerado com o nº do pedido', () => {
    const r = req({ rc: '4500049874', status: 'rc_aprovada' })
    expect(bloqueioDoStatus(r, 'pedido_gerado')).toMatch(/pedido/)
    expect(bloqueioDoStatus({ ...r, pedido: '4700095971' }, 'pedido_gerado')).toBeNull()
  })

  it('cancelada e concluída não avançam', () => {
    expect(proximoStatus(req({ status: 'cancelada' }))).toBeUndefined()
    expect(proximoStatus(req({ status: 'concluida', pedido: '1' }))).toBeUndefined()
    expect(proximoStatus(req())?.id).toBe('rc_aprovada')
    expect(bloqueioDoStatus(req({ status: 'cancelada' }), 'rc_aprovada')).toMatch(/cancelada/)
    expect(bloqueioDoStatus(req({ status: 'concluida', pedido: '1' }), 'cancelada')).toMatch(/concluída/)
  })

  it('soma o que já virou NF e o que foi pago', () => {
    const f = faturamento(req(), [nota(300, true), nota(200, false), nota(999, false, 'outra')])
    expect(f).toEqual({ faturado: 500, pago: 300, saldo: 500, emAberto: 1 })
  })

  it('exige empresa, projeto e valor', () => {
    expect(validarRequisicao(req({ fornecedorId: '' }))).toMatch(/empresa/)
    expect(validarRequisicao(req({ valorTotal: 0 }))).toMatch(/valor/)
    expect(validarRequisicao(req())).toBeNull()
  })
})

describe('níveis de acesso', () => {
  it('Sala VIP só vê o envio e os úteis da Sala VIP', () => {
    expect(ambientesDoPerfil('vip')).toEqual(['vip'])
    expect(abasDoPerfil('vip', 'vip').map((a) => a.id)).toEqual(['enviar', 'uteis'])
    expect(abasDoPerfil('vip', 'comercial')).toEqual([])
  })

  it('operador só vê o Notas Comercial, sem cadastros', () => {
    expect(ambientesDoPerfil('operador')).toEqual(['comercial'])
    expect(abasDoPerfil('operador', 'comercial').map((a) => a.id)).toEqual(['requisicoes', 'notas', 'painel', 'uteis'])
    expect(abasDoPerfil('operador', 'vip')).toEqual([])
    expect(podeEditarUteis('operador', 'comercial')).toBe(true)
    expect(podeEditarUteis('operador', 'vip')).toBe(false)
  })

  it('Comercial vê tudo e Gestão só painéis e úteis', () => {
    expect(abasDoPerfil('comercial', 'comercial').map((a) => a.id)).toEqual(['requisicoes', 'notas', 'painel', 'uteis', 'cadastros'])
    expect(abasDoPerfil('gestao', 'vip').map((a) => a.id)).toEqual(['painel', 'uteis'])
    expect(podeEditarUteis('gestao', 'comercial')).toBe(false)
  })
})
