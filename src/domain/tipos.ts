// Modelo de dados do portal. Estes tipos são o "contrato" entre as telas e o
// armazenamento (hoje o navegador, amanhã o Supabase). Ver supabase/schema.sql.

export type Perfil = 'vip' | 'comercial' | 'gestao'

export type EtapaId = 'recebida' | 'conferida' | 'oc' | 'migo' | 'acordo' | 'chamado' | 'paga'

/** Um registro de que a nota entrou numa etapa: quando e por quem. É a base do SLA. */
export interface RegistroEtapa {
  etapa: EtapaId
  em: string // ISO 8601
  por: string
}

/** Uma alteração de dados (não de etapa), para auditoria. */
export interface Alteracao {
  em: string
  por: string
  descricao: string
}

export interface Nota {
  id: string
  fornecedorId: string
  numero: string
  valor: number
  emissao: string // ISO, só a data importa
  vencimento: string // ISO, só a data importa
  /** Nº do contrato básico (CB) ou vazio quando a nota segue por RC. */
  contrato: string
  centroCusto: string
  oc: string
  folha: string
  chamado: string
  /** Texto da pendência em aberto; vazio quando não há. */
  pendencia: string
  /** Nome original do arquivo anexado, se houver. */
  arquivoNome: string
  etapas: RegistroEtapa[]
  alteracoes: Alteracao[]
}

export interface Fornecedor {
  id: string
  nome: string
  razaoSocial: string
  cnpj: string
  codigoSap: string
  tipo: string
  centroCusto: string
  ativo: boolean
}

export interface Contrato {
  id: string
  numero: string
  fornecedorId: string
  /** Valor total do contrato, em R$. */
  valor: number
  ativo: boolean
}

export interface RegistroAuditoria {
  em: string
  por: string
  entidade: 'fornecedor' | 'contrato'
  descricao: string
}

/** Campos que a Sala VIP preenche ao enviar uma NF. */
export interface NovaNota {
  fornecedorId: string
  numero: string
  valor: number
  emissao: string
  vencimento: string
}
