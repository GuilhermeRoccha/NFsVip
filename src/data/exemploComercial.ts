// Dados fictícios do ambiente Notas Comercial: requisições de compra e as NFs de cada pedido.
// Empresas, pessoas, números e valores são inventados.

import { STATUS_REQUISICAO } from '../domain/requisicoes'
import { DIA_MS, inicioDoDia, pagamentoNoOuApos, quintaNoOuApos } from '../domain/regras'
import type { EtapaId, Fornecedor, Nota, Requisicao, StatusRequisicao } from '../domain/tipos'
import { aleatorio } from './aleatorio'

const EMPRESAS = [
  { nome: 'Quadra Arquitetura', cc: '410.04', tipo: 'Projetos' },
  { nome: 'Sinaliza Comunicação Visual', cc: '410.02', tipo: 'Comunicação visual' },
  { nome: 'Traço Engenharia', cc: '410.05', tipo: 'Consultoria' },
  { nome: 'Imagem Viva Fotografia', cc: '410.03', tipo: 'Fotografia' },
  { nome: 'Contêiner Planalto', cc: '410.03', tipo: 'Locação' },
  { nome: 'ObraFácil Software', cc: '410.04', tipo: 'Software' },
]

// [empresa, projeto, valor, parcelas, status, meses atrás]
const PEDIDOS: [number, string, number, number, StatusRequisicao, number][] = [
  [0, 'Projeto de expansão da sala VIP', 49900, 2, 'concluida', 8],
  [1, 'Adesivagem dos tapumes do saguão', 5400, 1, 'concluida', 7],
  [3, 'Imagens do saguão para mídia', 900, 1, 'concluida', 7],
  [5, 'Mensalidade do software de obras', 3064, 6, 'em_andamento', 6],
  [2, 'Consultoria para projeto executivo', 63000, 3, 'em_andamento', 5],
  [4, 'Aluguel de contêineres depósito', 8000, 3, 'em_andamento', 4],
  [4, 'Instalação dos contêineres depósito', 7200, 1, 'concluida', 4],
  [1, 'Sinalização do estacionamento', 12800, 2, 'nf_solicitada', 3],
  [0, 'Anteprojeto da área comercial', 17750, 1, 'nf_solicitada', 2],
  [3, 'Fotos da sala VIP doméstica', 1050, 0, 'pedido_aprovado', 1],
  [2, 'Levantamento topográfico', 5500, 0, 'pedido_gerado', 1],
  [1, 'Placas da área de embarque remoto', 4150, 0, 'rc_aprovada', 0],
  [0, 'Revisão do layout do lounge', 8000, 0, 'rc_aberta', 0],
  [3, 'Vídeo institucional', 6200, 0, 'cancelada', 3],
]

const CONDICOES = ['30 dias após o aceite', 'Na entrega do serviço', '40% de entrada e 60% na entrega', '30 dias após o aceite']
const GESTORES = ['Ana', 'Bruno', 'Carla']

export function exemploComercial(agora: Date, primeiroId: number) {
  const r = aleatorio(20261029)
  const fornecedores: Fornecedor[] = EMPRESAS.map((e, i) => ({
    id: `f${primeiroId + i + 1}`,
    nome: e.nome,
    razaoSocial: `${e.nome} Ltda`,
    cnpj: `${30 + i}.${410 + i * 3}.${520 + i * 11}/0001-${40 + i}`,
    codigoSap: String(107400 + i * 53),
    tipo: e.tipo,
    centroCusto: e.cc,
    ativo: true,
  }))

  const requisicoes: Requisicao[] = []
  const notas: Nota[] = []
  let rc = 4500049700
  let pedido = 4700095800
  let nf = 21800
  let folha = 1000058200
  let chamado = 22080

  PEDIDOS.forEach(([ei, projeto, valor, parcelas, status, mesesAtras], i) => {
    const e = EMPRESAS[ei]
    const f = fornecedores[ei]
    const dataRc = inicioDoDia(new Date(agora.getFullYear(), agora.getMonth() - mesesAtras, 2 + Math.floor(r() * 20)))
    if (dataRc > agora) dataRc.setTime(+inicioDoDia(agora) - 2 * DIA_MS)
    const ordem = status === 'cancelada' ? 1 : STATUS_REQUISICAO.findIndex((s) => s.id === status)
    const temRc = ordem >= 1 || status === 'cancelada'
    const temPedido = ordem >= 2 && status !== 'cancelada'
    const req: Requisicao = {
      id: `r${i + 1}`,
      dataRc: dataRc.toISOString(),
      tipo: ei === 5 ? 'material' : 'servico',
      fornecedorId: f.id,
      projeto,
      centroCusto: e.cc,
      rc: temRc ? String((rc += 37)) : '',
      pedido: temPedido ? String((pedido += 41)) : '',
      valorTotal: valor,
      condicaoPagamento: CONDICOES[i % CONDICOES.length],
      gestor: GESTORES[i % GESTORES.length],
      obs: '',
      status,
      historico: [{ em: dataRc.toISOString(), por: 'Comercial', descricao: 'Requisição registrada' }],
    }
    requisicoes.push(req)

    // NFs do pedido: parcelas iguais, uma por mês depois da RC.
    for (let p = 0; p < parcelas; p++) {
      const recebida = new Date(dataRc.getTime() + (25 + p * 30 + Math.floor(r() * 6)) * DIA_MS)
      recebida.setHours(9 + Math.floor(r() * 7), Math.floor(r() * 60))
      if (recebida > agora) break
      const n: Nota = {
        id: `nc${i + 1}-${p + 1}`,
        origem: 'comercial',
        requisicaoId: req.id,
        fornecedorId: f.id,
        numero: String((nf += 13)),
        valor: Math.round((valor / parcelas) * 100) / 100,
        emissao: inicioDoDia(new Date(recebida.getTime() - DIA_MS)).toISOString(),
        vencimento: inicioDoDia(new Date(recebida.getTime() + 30 * DIA_MS)).toISOString(),
        contrato: '',
        centroCusto: e.cc,
        oc: req.pedido,
        folha: '',
        chamado: '',
        pendencia: '',
        arquivoNome: '',
        etapas: (['recebida', 'conferida', 'oc'] as EtapaId[]).map((etapa) => ({ etapa, em: recebida.toISOString(), por: 'Comercial' })),
        alteracoes: [],
      }
      notas.push(n)
      let t = recebida
      const passo = (etapa: EtapaId, diasDepois: number, por: string) => {
        t = new Date(t.getTime() + diasDepois * DIA_MS)
        if (t > agora) return false
        n.etapas.push({ etapa, em: t.toISOString(), por })
        return true
      }
      if (!passo('migo', 1 + r() * 2, 'Comercial')) continue
      n.folha = String((folha += 3))
      if (!passo('acordo', 0.5 + r() * 3, req.gestor)) continue
      const quinta = quintaNoOuApos(new Date(t.getTime() + 0.1 * DIA_MS))
      quinta.setHours(10, 15)
      if (quinta > agora) continue
      t = quinta
      n.etapas.push({ etapa: 'chamado', em: t.toISOString(), por: 'Comercial' })
      n.chamado = String((chamado += 7))
      const pagamento = pagamentoNoOuApos(new Date(t.getTime() + 7 * DIA_MS))
      pagamento.setHours(15, 0)
      if (pagamento > agora) continue
      n.etapas.push({ etapa: 'paga', em: pagamento.toISOString(), por: 'Financeiro' })
    }
  })

  return { fornecedores, requisicoes, notas }
}
