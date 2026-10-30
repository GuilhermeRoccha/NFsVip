import { proximaEtapa } from '../domain/etapas'
import { bloqueioParaAvancar } from '../domain/regras'
import { aceitaNota, descreverEdicao } from '../domain/requisicoes'
import type { Acesso, Contrato, Fornecedor, Nota, Requisicao, StatusRequisicao, Util } from '../domain/tipos'
import { ErroDeRegra, type Armazenamento, type Dados } from './armazenamento'
import { apagarArquivo, guardarArquivo, lerArquivo, limparArquivos } from './arquivosLocais'
import {
  checarExclusaoRequisicao,
  checarStatus,
  descreverAlteracoes,
  descricaoAcesso,
  descricaoExclusao,
  descricaoExclusaoRequisicao,
  descricaoRemocaoAcesso,
  descricaoUtil,
  etapasIniciais,
  MSG_NF_DUPLICADA,
  MSG_REQUISICAO_SEM_PEDIDO,
  validarAcesso,
  validarContrato,
  validarFornecedor,
  validarReq,
  validarUtil,
} from './comum'
import { gerarExemplo } from './exemplo'

// v4: notas com origem, previsão de pagamento manual, requisições, acessos e úteis.
const CHAVE = 'portal-nf-dados-v4'

const novoId = () => crypto.randomUUID()
const agoraISO = () => new Date().toISOString()

/** Implementação de demonstração: tudo fica no navegador de quem está usando. */
export class ArmazenamentoLocal implements Armazenamento {
  private dados: Dados

  constructor() {
    this.dados = this.ler() ?? gerarExemplo(new Date())
    this.gravar()
  }

  private ler(): Dados | null {
    try {
      const bruto = localStorage.getItem(CHAVE)
      return bruto ? (JSON.parse(bruto) as Dados) : null
    } catch {
      return null
    }
  }

  private gravar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(this.dados))
    } catch {
      // Sem localStorage (aba anônima, por exemplo): segue só em memória.
    }
  }

  private nota(id: string): Nota {
    const n = this.dados.notas.find((x) => x.id === id)
    if (!n) throw new ErroDeRegra('Nota não encontrada.')
    return n
  }

  async carregar() {
    return structuredClone(this.dados)
  }

  async enviarNota(nova: Parameters<Armazenamento['enviarNota']>[0], arquivo: File | null, por: string) {
    const duplicada = this.dados.notas.some(
      (n) => n.fornecedorId === nova.fornecedorId && n.numero.trim() === nova.numero.trim(),
    )
    if (duplicada) throw new ErroDeRegra(MSG_NF_DUPLICADA)
    const f = this.dados.fornecedores.find((x) => x.id === nova.fornecedorId)
    const contrato = this.dados.contratos.find((c) => c.fornecedorId === nova.fornecedorId && c.ativo)
    const { requisicaoId = '', ...campos } = nova
    // Nota do Comercial: os dados vêm do pedido.
    const req = requisicaoId ? this.dados.requisicoes.find((r) => r.id === requisicaoId) : undefined
    if (requisicaoId && (!req || !aceitaNota(req))) throw new ErroDeRegra(MSG_REQUISICAO_SEM_PEDIDO)
    const em = agoraISO()
    const nota: Nota = {
      id: novoId(),
      origem: req ? 'comercial' : 'vip',
      requisicaoId,
      ...campos,
      fornecedorId: req?.fornecedorId ?? campos.fornecedorId,
      contrato: req ? '' : (contrato?.numero ?? ''),
      centroCusto: req?.centroCusto ?? f?.centroCusto ?? '',
      oc: req?.pedido ?? '',
      folha: '',
      chamado: '',
      pendencia: '',
      previsaoPagamento: '',
      arquivoNome: arquivo?.name ?? '',
      etapas: etapasIniciais(!!req).map((etapa) => ({ etapa, em, por })),
      alteracoes: [],
    }
    if (arquivo) await guardarArquivo(nota.id, arquivo)
    this.dados.notas.push(nota)
    this.gravar()
    return structuredClone(nota)
  }

  async atualizarNota(id: string, campos: Partial<Nota>, por: string) {
    const n = this.nota(id)
    const { mudou, descricoes } = descreverAlteracoes(n, campos)
    if (!descricoes.length) return structuredClone(n)
    for (const descricao of descricoes) n.alteracoes.push({ em: agoraISO(), por, descricao })
    Object.assign(n, mudou)
    this.gravar()
    return structuredClone(n)
  }

  async avancarEtapa(id: string, por: string) {
    const n = this.nota(id)
    const bloqueio = bloqueioParaAvancar(n)
    if (bloqueio) throw new ErroDeRegra(bloqueio)
    const prox = proximaEtapa(n)!
    n.etapas.push({ etapa: prox.id, em: agoraISO(), por })
    this.gravar()
    return structuredClone(n)
  }

  async excluirNota(id: string, motivo: string, por: string) {
    const n = this.nota(id)
    if (!motivo.trim()) throw new ErroDeRegra('Informe o motivo da exclusão.')
    const f = this.dados.fornecedores.find((x) => x.id === n.fornecedorId)
    this.dados.notas = this.dados.notas.filter((x) => x.id !== id)
    this.dados.auditoria.push({
      em: agoraISO(),
      por,
      entidade: 'nota',
      descricao: descricaoExclusao(n, f?.nome ?? 'fornecedor desconhecido', motivo),
    })
    this.gravar()
    if (n.arquivoNome) await apagarArquivo(id).catch(() => undefined)
  }

  async salvarFornecedor(f: Fornecedor, por: string) {
    const existente = this.dados.fornecedores.find((x) => x.id === f.id)
    validarFornecedor(f, this.dados.fornecedores)
    const salvo = { ...f, id: f.id || novoId() }
    if (existente) Object.assign(existente, salvo)
    else this.dados.fornecedores.push(salvo)
    this.dados.auditoria.push({
      em: agoraISO(),
      por,
      entidade: 'fornecedor',
      descricao: `${existente ? 'Editou' : 'Cadastrou'} o fornecedor ${salvo.nome}`,
    })
    this.gravar()
    return structuredClone(salvo)
  }

  async salvarContrato(c: Contrato, por: string) {
    validarContrato(c)
    const existente = this.dados.contratos.find((x) => x.id === c.id)
    const salvo = { ...c, id: c.id || novoId() }
    if (existente) Object.assign(existente, salvo)
    else this.dados.contratos.push(salvo)
    this.dados.auditoria.push({
      em: agoraISO(),
      por,
      entidade: 'contrato',
      descricao: `${existente ? 'Editou' : 'Cadastrou'} o contrato ${salvo.numero}`,
    })
    this.gravar()
    return structuredClone(salvo)
  }

  private requisicao(id: string): Requisicao {
    const r = this.dados.requisicoes.find((x) => x.id === id)
    if (!r) throw new ErroDeRegra('Requisição não encontrada.')
    return r
  }

  private nomeFornecedor = (id: string) => this.dados.fornecedores.find((f) => f.id === id)?.nome ?? '—'

  async salvarRequisicao(r: Requisicao, por: string) {
    validarReq(r)
    const limpo = { ...r, projeto: r.projeto.trim(), rc: r.rc.trim(), pedido: r.pedido.trim() }
    if (!r.id) {
      const nova: Requisicao = {
        ...limpo,
        id: novoId(),
        status: 'rc_aberta',
        historico: [{ em: agoraISO(), por, descricao: 'Requisição registrada' }],
      }
      this.dados.requisicoes.push(nova)
      this.gravar()
      return structuredClone(nova)
    }
    const atual = this.requisicao(r.id)
    for (const descricao of descreverEdicao(atual, limpo, this.nomeFornecedor)) atual.historico.push({ em: agoraISO(), por, descricao })
    const { status: _status, historico: _historico, ...campos } = limpo
    Object.assign(atual, campos)
    this.gravar()
    return structuredClone(atual)
  }

  async mudarStatusRequisicao(id: string, status: StatusRequisicao, por: string, motivo = '') {
    const r = this.requisicao(id)
    const descricao = checarStatus(r, status, motivo)
    r.status = status
    r.historico.push({ em: agoraISO(), por, descricao })
    this.gravar()
    return structuredClone(r)
  }

  async excluirRequisicao(id: string, motivo: string, por: string) {
    const r = this.requisicao(id)
    checarExclusaoRequisicao(r, this.dados.notas, motivo)
    this.dados.requisicoes = this.dados.requisicoes.filter((x) => x.id !== id)
    this.dados.auditoria.push({
      em: agoraISO(),
      por,
      entidade: 'requisicao',
      descricao: descricaoExclusaoRequisicao(r, this.nomeFornecedor(r.fornecedorId), motivo),
    })
    this.gravar()
  }

  async salvarAcesso(a: Acesso, por: string) {
    const novo = validarAcesso(a)
    const antes = this.dados.acessos.find((x) => x.email === novo.email)
    if (antes && antes.nome === novo.nome && antes.perfil === novo.perfil) return
    this.dados.acessos = [...this.dados.acessos.filter((x) => x.email !== novo.email), novo]
    this.dados.auditoria.push({ em: agoraISO(), por, entidade: 'acesso', descricao: descricaoAcesso(novo, antes) })
    this.gravar()
  }

  async removerAcesso(email: string, por: string) {
    const a = this.dados.acessos.find((x) => x.email === email)
    if (!a) return
    this.dados.acessos = this.dados.acessos.filter((x) => x.email !== email)
    this.dados.auditoria.push({ em: agoraISO(), por, entidade: 'acesso', descricao: descricaoRemocaoAcesso(a) })
    this.gravar()
  }

  async salvarUtil(u: Util, por: string) {
    const limpo = validarUtil(u)
    const existente = this.dados.uteis.find((x) => x.id === u.id)
    if (existente) Object.assign(existente, limpo)
    else this.dados.uteis.push({ ...limpo, id: novoId() })
    this.dados.auditoria.push({ em: agoraISO(), por, entidade: 'util', descricao: descricaoUtil(limpo, existente ? 'Editou' : 'Adicionou') })
    this.gravar()
  }

  async excluirUtil(id: string, por: string) {
    const u = this.dados.uteis.find((x) => x.id === id)
    if (!u) return
    this.dados.uteis = this.dados.uteis.filter((x) => x.id !== id)
    this.dados.auditoria.push({ em: agoraISO(), por, entidade: 'util', descricao: descricaoUtil(u, 'Excluiu') })
    this.gravar()
  }

  async urlDoArquivo(notaId: string) {
    const blob = await lerArquivo(notaId).catch(() => undefined)
    return blob ? URL.createObjectURL(blob) : null
  }

  async restaurarExemplo() {
    this.dados = gerarExemplo(new Date())
    await limparArquivos().catch(() => undefined)
    this.gravar()
  }
}

