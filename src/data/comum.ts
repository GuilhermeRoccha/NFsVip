// Regras de gravação usadas pelos dois armazenamentos (navegador e Supabase),
// para que os dois se comportem igual.

import type { Contrato, Fornecedor, Nota } from '../domain/tipos'
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
