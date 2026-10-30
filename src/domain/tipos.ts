// Modelo de dados do portal. Estes tipos são o "contrato" entre as telas e o
// armazenamento (hoje o navegador, amanhã o Supabase). Ver supabase/schema.sql.

/**
 * Nível de acesso. Sala VIP: só o ambiente da Sala VIP. Comercial: admin, faz tudo.
 * Operador: só o ambiente Notas Comercial, sem cadastros. Gestão: só os painéis.
 */
export type Perfil = 'vip' | 'comercial' | 'operador' | 'gestao'

/** Os dois ambientes do portal: notas que a Sala VIP envia e o controle de compras do próprio Comercial. */
export type Ambiente = 'vip' | 'comercial'

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
  /** De qual ambiente a nota é. */
  origem: Ambiente
  /** Requisição (pedido) de onde a nota veio. Só nas notas do Comercial; vazio nas da Sala VIP. */
  requisicaoId: string
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
  /** Data prevista de pagamento, preenchida pelo Comercial na fila (ISO). Vazio até ser informada. */
  previsaoPagamento: string
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
  entidade: 'nota' | 'fornecedor' | 'contrato' | 'requisicao' | 'acesso' | 'util'
  descricao: string
}

/** Campos de uma NF nova. A Sala VIP preenche os cinco primeiros; o Comercial lança a partir de uma requisição. */
export interface NovaNota {
  fornecedorId: string
  numero: string
  valor: number
  emissao: string
  vencimento: string
  /** Só nas notas do Comercial: a requisição (pedido) de onde a nota vem. */
  requisicaoId?: string
}

export type StatusRequisicao =
  | 'rc_aberta'
  | 'rc_aprovada'
  | 'pedido_gerado'
  | 'pedido_aprovado'
  | 'em_andamento'
  | 'nf_solicitada'
  | 'concluida'
  | 'cancelada'

/** Uma requisição de compra do Comercial (RC → pedido → serviço → NFs). Espelha a aba "Requisições" da planilha. */
export interface Requisicao {
  id: string
  dataRc: string // ISO, só a data importa
  tipo: 'servico' | 'material'
  fornecedorId: string
  projeto: string
  centroCusto: string
  rc: string
  pedido: string
  valorTotal: number
  condicaoPagamento: string
  /** Quem aprova a folha (gestor da área). */
  gestor: string
  obs: string
  status: StatusRequisicao
  /** Mudanças de status e de dados, com data e responsável. */
  historico: Alteracao[]
}

/** Quem pode entrar no portal e com qual nível. O e-mail é o login. */
export interface Acesso {
  email: string
  nome: string
  perfil: Perfil
}

/** Seções da aba Úteis (a consulta rápida que ficava na aba "Úteis" da planilha). */
export type SecaoUtil = 'centros' | 'aprovadores' | 'recorrentes' | 'orientacoes' | 'contatos'

/** Uma linha da aba Úteis. Cada seção dá um sentido a título, valor e observação. */
export interface Util {
  id: string
  ambiente: Ambiente
  secao: SecaoUtil
  titulo: string
  valor: string
  obs: string
}
