import { proximaEtapa } from '../domain/etapas'
import { bloqueioParaAvancar } from '../domain/regras'
import type { Contrato, Fornecedor, Nota } from '../domain/tipos'
import { ErroDeRegra, type Armazenamento, type Dados } from './armazenamento'
import { apagarArquivo, guardarArquivo, lerArquivo, limparArquivos } from './arquivosLocais'
import { descreverAlteracoes, descricaoExclusao, MSG_NF_DUPLICADA, validarContrato, validarFornecedor } from './comum'
import { gerarExemplo } from './exemplo'

const CHAVE = 'portal-nf-dados-v1'

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
    const nota: Nota = {
      id: novoId(),
      ...nova,
      contrato: contrato?.numero ?? '',
      centroCusto: f?.centroCusto ?? '',
      oc: '',
      folha: '',
      chamado: '',
      pendencia: '',
      arquivoNome: arquivo?.name ?? '',
      etapas: [{ etapa: 'recebida', em: agoraISO(), por }],
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

