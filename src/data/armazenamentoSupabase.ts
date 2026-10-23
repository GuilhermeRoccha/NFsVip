// Implementação real: dados no banco do Supabase e arquivos no bucket privado "notas".
// Mesma interface do modo demonstração, então as telas não mudam.
// As permissões de cada perfil ficam no banco (supabase/schema.sql), não aqui.

import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { proximaEtapa } from '../domain/etapas'
import { bloqueioParaAvancar } from '../domain/regras'
import type { Contrato, EtapaId, Fornecedor, Nota, NovaNota, RegistroAuditoria } from '../domain/tipos'
import { deInputData, paraInputData } from '../lib/formato'
import { ErroDeRegra, type Armazenamento, type Dados } from './armazenamento'
import { descreverAlteracoes, descricaoExclusao, MSG_NF_DUPLICADA, validarContrato, validarFornecedor } from './comum'

const BUCKET = 'notas'
const POR_PAGINA = 1000 // limite padrão do Supabase por consulta

// ---------- Linhas como vêm do banco (snake_case) ----------

interface LinhaFornecedor {
  id: string
  nome: string
  razao_social: string
  cnpj: string
  codigo_sap: string
  tipo: string
  centro_custo: string
  ativo: boolean
}

interface LinhaContrato {
  id: string
  numero: string
  fornecedor_id: string
  valor: number | string
  ativo: boolean
}

export interface LinhaNota {
  id: string
  fornecedor_id: string
  numero: string
  valor: number | string
  emissao: string
  vencimento: string
  contrato: string
  centro_custo: string
  oc: string
  folha: string
  chamado: string
  pendencia: string
  arquivo_nome: string
  arquivo_caminho: string
  nota_etapas: { id: number; etapa: EtapaId; em: string; por: string }[]
  nota_alteracoes: { id: number; em: string; por: string; descricao: string }[]
}

interface LinhaAuditoria {
  em: string
  por: string
  entidade: RegistroAuditoria['entidade']
  descricao: string
}

const SELECT_NOTA = '*, nota_etapas(id, etapa, em, por), nota_alteracoes(id, em, por, descricao)'

// ---------- Conversões banco ↔ tipos do portal ----------

export function notaDaLinha(l: LinhaNota): Nota {
  const porId = <T extends { id: number }>(a: T, b: T) => a.id - b.id
  return {
    id: l.id,
    fornecedorId: l.fornecedor_id,
    numero: l.numero,
    valor: Number(l.valor),
    emissao: deInputData(l.emissao),
    vencimento: deInputData(l.vencimento),
    contrato: l.contrato,
    centroCusto: l.centro_custo,
    oc: l.oc,
    folha: l.folha,
    chamado: l.chamado,
    pendencia: l.pendencia,
    arquivoNome: l.arquivo_nome,
    etapas: [...l.nota_etapas].sort(porId).map(({ etapa, em, por }) => ({ etapa, em, por })),
    alteracoes: [...l.nota_alteracoes].sort(porId).map(({ em, por, descricao }) => ({ em, por, descricao })),
  }
}

/** Campos editáveis da nota → colunas do banco. */
export function colunasDaNota(c: Partial<Nota>): Record<string, unknown> {
  const r: Record<string, unknown> = {}
  if (c.valor !== undefined) r.valor = c.valor
  if (c.vencimento !== undefined) r.vencimento = paraInputData(c.vencimento)
  if (c.contrato !== undefined) r.contrato = c.contrato
  if (c.centroCusto !== undefined) r.centro_custo = c.centroCusto
  if (c.oc !== undefined) r.oc = c.oc
  if (c.folha !== undefined) r.folha = c.folha
  if (c.chamado !== undefined) r.chamado = c.chamado
  if (c.pendencia !== undefined) r.pendencia = c.pendencia
  return r
}

const fornecedorDaLinha = (l: LinhaFornecedor): Fornecedor => ({
  id: l.id,
  nome: l.nome,
  razaoSocial: l.razao_social,
  cnpj: l.cnpj,
  codigoSap: l.codigo_sap,
  tipo: l.tipo,
  centroCusto: l.centro_custo,
  ativo: l.ativo,
})

const linhaDoFornecedor = (f: Fornecedor) => ({
  nome: f.nome.trim(),
  razao_social: f.razaoSocial,
  cnpj: f.cnpj,
  codigo_sap: f.codigoSap,
  tipo: f.tipo,
  centro_custo: f.centroCusto,
  ativo: f.ativo,
})

const contratoDaLinha = (l: LinhaContrato): Contrato => ({
  id: l.id,
  numero: l.numero,
  fornecedorId: l.fornecedor_id,
  valor: Number(l.valor),
  ativo: l.ativo,
})

/** Nome do arquivo no bucket: ano/mês/id-nome, sem acentos nem espaços. */
export function caminhoDoArquivo(notaId: string, nome: string, agora = new Date()): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_')
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  return `${agora.getFullYear()}/${mes}/${notaId}-${limpo}`
}

/** Erros do banco viram mensagens que a tela sabe mostrar. */
function erroDoBanco(e: PostgrestError | null, duplicado = 'Esse registro já existe.'): void {
  if (!e) return
  if (e.code === '23505') throw new ErroDeRegra(duplicado)
  if (e.code === '42501') throw new ErroDeRegra('Seu perfil não tem permissão para isso.')
  throw new Error(e.message)
}

export class ArmazenamentoSupabase implements Armazenamento {
  private readonly db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  /** Busca todas as linhas, de mil em mil. */
  private async todas<T>(tabela: string, select = '*', ordem = 'id'): Promise<T[]> {
    const todas: T[] = []
    for (let de = 0; ; de += POR_PAGINA) {
      const { data, error } = await this.db
        .from(tabela)
        .select(select)
        .order(ordem)
        .range(de, de + POR_PAGINA - 1)
      erroDoBanco(error)
      todas.push(...((data ?? []) as T[]))
      if (!data || data.length < POR_PAGINA) return todas
    }
  }

  private async linhaNota(id: string): Promise<LinhaNota> {
    const { data, error } = await this.db.from('notas').select(SELECT_NOTA).eq('id', id).maybeSingle()
    erroDoBanco(error)
    if (!data) throw new ErroDeRegra('Nota não encontrada.')
    return data as LinhaNota
  }

  async carregar(): Promise<Dados> {
    const [fornecedores, contratos, notas, auditoria] = await Promise.all([
      this.todas<LinhaFornecedor>('fornecedores', '*', 'nome'),
      this.todas<LinhaContrato>('contratos', '*', 'numero'),
      this.todas<LinhaNota>('notas', SELECT_NOTA),
      this.todas<LinhaAuditoria & { id: number }>('auditoria'),
    ])
    return {
      fornecedores: fornecedores.map(fornecedorDaLinha),
      contratos: contratos.map(contratoDaLinha),
      notas: notas.map(notaDaLinha),
      auditoria: auditoria.map(({ em, por, entidade, descricao }) => ({ em, por, entidade, descricao })),
    }
  }

  async enviarNota(nova: NovaNota, arquivo: File | null): Promise<Nota> {
    const [{ data: f }, { data: c }] = await Promise.all([
      this.db.from('fornecedores').select('centro_custo').eq('id', nova.fornecedorId).maybeSingle(),
      this.db.from('contratos').select('numero').eq('fornecedor_id', nova.fornecedorId).eq('ativo', true).limit(1).maybeSingle(),
    ])
    const id = crypto.randomUUID()
    const caminho = arquivo ? caminhoDoArquivo(id, arquivo.name) : ''
    const { error } = await this.db.from('notas').insert({
      id,
      fornecedor_id: nova.fornecedorId,
      numero: nova.numero.trim(),
      valor: nova.valor,
      emissao: paraInputData(nova.emissao),
      vencimento: paraInputData(nova.vencimento),
      contrato: c?.numero ?? '',
      centro_custo: f?.centro_custo ?? '',
      arquivo_nome: arquivo?.name ?? '',
      arquivo_caminho: caminho,
    })
    erroDoBanco(error, MSG_NF_DUPLICADA)
    // A etapa "Recebida" é criada pelo próprio banco, com o nome de quem enviou (ver schema.sql).
    if (arquivo) {
      const { error: e } = await this.db.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type })
      if (e) throw new ErroDeRegra('A nota foi registrada, mas o arquivo não subiu. Abra a nota e tente anexar de novo.')
    }
    return notaDaLinha(await this.linhaNota(id))
  }

  async atualizarNota(id: string, campos: Partial<Nota>, por: string): Promise<Nota> {
    const atual = notaDaLinha(await this.linhaNota(id))
    const { mudou, descricoes } = descreverAlteracoes(atual, campos)
    if (!descricoes.length) return atual
    erroDoBanco((await this.db.from('notas').update(colunasDaNota(mudou)).eq('id', id)).error)
    erroDoBanco((await this.db.from('nota_alteracoes').insert(descricoes.map((descricao) => ({ nota_id: id, por, descricao })))).error)
    return notaDaLinha(await this.linhaNota(id))
  }

  async avancarEtapa(id: string, por: string): Promise<Nota> {
    const n = notaDaLinha(await this.linhaNota(id))
    const bloqueio = bloqueioParaAvancar(n)
    if (bloqueio) throw new ErroDeRegra(bloqueio)
    erroDoBanco((await this.db.from('nota_etapas').insert({ nota_id: id, etapa: proximaEtapa(n)!.id, por })).error)
    return notaDaLinha(await this.linhaNota(id))
  }

  async excluirNota(id: string, motivo: string, por: string): Promise<void> {
    if (!motivo.trim()) throw new ErroDeRegra('Informe o motivo da exclusão.')
    const linha = await this.linhaNota(id)
    const { data: f } = await this.db.from('fornecedores').select('nome').eq('id', linha.fornecedor_id).maybeSingle()
    const descricao = descricaoExclusao(notaDaLinha(linha), f?.nome ?? 'fornecedor desconhecido', motivo)
    erroDoBanco((await this.db.from('notas').delete().eq('id', id)).error)
    erroDoBanco((await this.db.from('auditoria').insert({ por, entidade: 'nota', descricao })).error)
    if (linha.arquivo_caminho) await this.db.storage.from(BUCKET).remove([linha.arquivo_caminho])
  }

  async salvarFornecedor(f: Fornecedor, por: string): Promise<Fornecedor> {
    validarFornecedor(f, [])
    const consulta = f.id
      ? this.db.from('fornecedores').update(linhaDoFornecedor(f)).eq('id', f.id).select().single()
      : this.db.from('fornecedores').insert(linhaDoFornecedor(f)).select().single()
    const { data, error } = await consulta
    erroDoBanco(error, 'Já existe um fornecedor com esse nome.')
    const salvo = fornecedorDaLinha(data as LinhaFornecedor)
    const descricao = `${f.id ? 'Editou' : 'Cadastrou'} o fornecedor ${salvo.nome}`
    erroDoBanco((await this.db.from('auditoria').insert({ por, entidade: 'fornecedor', descricao })).error)
    return salvo
  }

  async salvarContrato(c: Contrato, por: string): Promise<Contrato> {
    validarContrato(c)
    const linha = { numero: c.numero.trim(), fornecedor_id: c.fornecedorId, valor: c.valor, ativo: c.ativo }
    const consulta = c.id
      ? this.db.from('contratos').update(linha).eq('id', c.id).select().single()
      : this.db.from('contratos').insert(linha).select().single()
    const { data, error } = await consulta
    erroDoBanco(error, 'Já existe um contrato com esse número.')
    const salvo = contratoDaLinha(data as LinhaContrato)
    const descricao = `${c.id ? 'Editou' : 'Cadastrou'} o contrato ${salvo.numero}`
    erroDoBanco((await this.db.from('auditoria').insert({ por, entidade: 'contrato', descricao })).error)
    return salvo
  }

  async urlDoArquivo(notaId: string): Promise<string | null> {
    const { data: n } = await this.db.from('notas').select('arquivo_caminho').eq('id', notaId).maybeSingle()
    if (!n?.arquivo_caminho) return null
    // Link temporário: vale 5 minutos e só funciona para quem está logado no portal.
    const { data } = await this.db.storage.from(BUCKET).createSignedUrl(n.arquivo_caminho, 300)
    return data?.signedUrl ?? null
  }
}
