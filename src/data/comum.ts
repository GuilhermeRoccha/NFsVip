// Regras de gravação usadas pelos dois armazenamentos (navegador e Supabase),
// para que os dois se comportem igual.

import { emailValido, NOME_DO_PERFIL, normalizarEmail } from '../domain/acesso'
import { ETAPAS } from '../domain/etapas'
import { bloqueioDoStatus, descreverStatus, notasDaRequisicao, validarRequisicao } from '../domain/requisicoes'
import type { Acesso, Contrato, EtapaId, Fornecedor, Nota, Requisicao, StatusRequisicao } from '../domain/tipos'
import { ErroDeRegra } from './armazenamento'

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

/** Só os campos que de fato mudaram, cada um com a frase que vai para o histórico da nota. */
export function descreverAlteracoes(n: Nota, campos: Partial<Nota>): { mudou: Partial<Nota>; descricoes: string[] } {
  const mudou: Partial<Nota> = {}
  const descricoes: string[] = []
  for (const k of Object.keys(campos) as (keyof Nota)[]) {
    if (campos[k] === n[k]) continue
    Object.assign(mudou, { [k]: campos[k] })
    const antes = String(n[k] ?? '') || 'vazio'
    const depois = String(campos[k] ?? '') || 'vazio'
    descricoes.push(`${ROTULOS[k] ?? k}: ${antes} → ${depois}`)
  }
  return { mudou, descricoes }
}

export function validarFornecedor(f: Fornecedor, todos: Fornecedor[]) {
  if (!f.nome.trim()) throw new ErroDeRegra('Informe o nome do fornecedor.')
  const repetido = todos.some((x) => x.id !== f.id && x.nome.trim().toLowerCase() === f.nome.trim().toLowerCase())
  if (repetido) throw new ErroDeRegra('Já existe um fornecedor com esse nome.')
}

export function validarContrato(c: Contrato) {
  if (!c.numero.trim()) throw new ErroDeRegra('Informe o número do contrato.')
  if (!c.fornecedorId) throw new ErroDeRegra('Escolha o fornecedor do contrato.')
  if (!(c.valor > 0)) throw new ErroDeRegra('Informe o valor do contrato.')
}

export const MSG_NF_DUPLICADA = 'Essa NF já foi enviada para este fornecedor. Confira o número antes de reenviar.'

export const descricaoExclusao = (n: Nota, fornecedor: string, motivo: string) =>
  `Excluiu a NF ${n.numero} de ${fornecedor} (R$ ${n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Motivo: ${motivo.trim()}`

export function validarReq(r: Requisicao) {
  const erro = validarRequisicao(r)
  if (erro) throw new ErroDeRegra(erro)
}

/** Confere se pode mudar o status e devolve a frase do histórico. */
export function checarStatus(r: Requisicao, status: StatusRequisicao, motivo = ''): string {
  const bloqueio = bloqueioDoStatus(r, status)
  if (bloqueio) throw new ErroDeRegra(bloqueio)
  if (status === 'cancelada' && !motivo.trim()) throw new ErroDeRegra('Informe o motivo do cancelamento.')
  return descreverStatus(r.status, status, motivo)
}

export function checarExclusaoRequisicao(r: Requisicao, notas: Nota[], motivo: string) {
  if (!motivo.trim()) throw new ErroDeRegra('Informe o motivo da exclusão.')
  const nfs = notasDaRequisicao(r, notas).length
  if (nfs) throw new ErroDeRegra(`Esta requisição tem ${nfs} NF${nfs > 1 ? 's' : ''}. Exclua as notas antes, ou cancele a requisição.`)
}

export const descricaoExclusaoRequisicao = (r: Requisicao, fornecedor: string, motivo: string) =>
  `Excluiu a requisição "${r.projeto}" de ${fornecedor}${r.rc ? ` (RC ${r.rc})` : ''}. Motivo: ${motivo.trim()}`

export function validarAcesso(a: Acesso): Acesso {
  const email = normalizarEmail(a.email)
  if (!emailValido(email)) throw new ErroDeRegra('Informe um e-mail válido.')
  if (!a.nome.trim()) throw new ErroDeRegra('Informe o nome da pessoa.')
  return { email, nome: a.nome.trim(), perfil: a.perfil }
}

export const descricaoAcesso = (a: Acesso, antes?: Acesso) =>
  antes
    ? `Mudou o acesso de ${a.nome} (${a.email}): ${NOME_DO_PERFIL[antes.perfil]} → ${NOME_DO_PERFIL[a.perfil]}`
    : `Liberou o acesso de ${a.nome} (${a.email}) como ${NOME_DO_PERFIL[a.perfil]}`

export const descricaoRemocaoAcesso = (a: Acesso) => `Tirou o acesso de ${a.nome} (${a.email})`


/**
 * Etapas com que uma nota nasce. A do Comercial já vem do pedido: recebida, conferida e com OC.
 * O Supabase faz o mesmo no gatilho registrar_entrada (schema.sql).
 */
export function etapasIniciais(comercial: boolean): EtapaId[] {
  return comercial ? ETAPAS.slice(0, 3).map((e) => e.id) : ['recebida']
}

export const MSG_REQUISICAO_SEM_PEDIDO = 'Escolha um pedido válido (com nº de pedido e não cancelado).'
