import { proximaEtapa } from '../domain/etapas'
import { bloqueioParaAvancar } from '../domain/regras'
import type { Contrato, Fornecedor, Nota } from '../domain/tipos'
import { ErroDeRegra, type Armazenamento, type Dados } from './armazenamento'
import { guardarArquivo, lerArquivo, limparArquivos } from './arquivosLocais'
import { gerarExemplo } from './exemplo'

const CHAVE = 'portal-nf-dados-v1'

const novoId = () => crypto.randomUUID()
const agoraISO = () => new Date().toISOString()

const ROTULOS: Partial<Record<keyof Nota, string>> = {
  contrato: 'Contrato/RC',
  centroCusto: 'Centro de custo',
  oc: 'OC',
  folha: 'MIGO/Folha',
  chamado: 'Chamado',
  valor: 'Valor',
  vencimento: 'Vencimento',
  pendencia: 'Pendência',
}

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
    if (duplicada) throw new ErroDeRegra('Essa NF já foi enviada para este fornecedor. Confira o número antes de reenviar.')
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
    const mudou = (Object.keys(campos) as (keyof Nota)[]).filter((k) => campos[k] !== n[k])
    if (!mudou.length) return structuredClone(n)
    for (const k of mudou) {
      const antes = String(n[k] ?? '') || 'vazio'
      const depois = String(campos[k] ?? '') || 'vazio'
      n.alteracoes.push({ em: agoraISO(), por, descricao: `${ROTULOS[k] ?? k}: ${antes} → ${depois}` })
    }
    Object.assign(n, campos)
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

  async salvarFornecedor(f: Fornecedor, por: string) {
    const existente = this.dados.fornecedores.find((x) => x.id === f.id)
    const nomeRepetido = this.dados.fornecedores.some(
      (x) => x.id !== f.id && x.nome.trim().toLowerCase() === f.nome.trim().toLowerCase(),
    )
    if (!f.nome.trim()) throw new ErroDeRegra('Informe o nome do fornecedor.')
    if (nomeRepetido) throw new ErroDeRegra('Já existe um fornecedor com esse nome.')
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
    if (!c.numero.trim()) throw new ErroDeRegra('Informe o número do contrato.')
    if (!c.fornecedorId) throw new ErroDeRegra('Escolha o fornecedor do contrato.')
    if (!(c.valor > 0)) throw new ErroDeRegra('Informe o valor do contrato.')
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

