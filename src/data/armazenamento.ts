// Interface única de acesso aos dados. As telas só falam com ela.
// Duas implementações: armazenamentoLocal.ts (demonstração, no navegador) e
// armazenamentoSupabase.ts (banco de verdade). data/index.ts escolhe qual usar.

import type {
  Acesso,
  Contrato,
  Fornecedor,
  Nota,
  NovaNota,
  RegistroAuditoria,
  Requisicao,
  StatusRequisicao,
} from '../domain/tipos'

export interface Dados {
  notas: Nota[]
  fornecedores: Fornecedor[]
  contratos: Contrato[]
  requisicoes: Requisicao[]
  /** Quem pode entrar. Só o Comercial recebe a lista completa. */
  acessos: Acesso[]
  auditoria: RegistroAuditoria[]
}

export interface Armazenamento {
  carregar(): Promise<Dados>

  /**
   * Cria a nota e guarda o arquivo, se houver. Nota da Sala VIP nasce em "Recebida".
   * Nota do Comercial (com requisicaoId) já nasce em "OC emitida", com os dados do pedido.
   */
  enviarNota(nova: NovaNota, arquivo: File | null, por: string): Promise<Nota>
  /** Atualiza campos da nota e registra a alteração. */
  atualizarNota(id: string, campos: Partial<Nota>, por: string): Promise<Nota>
  /** Move a nota para a próxima etapa. Valida as regras antes. */
  avancarEtapa(id: string, por: string): Promise<Nota>

  /** Exclui a nota e o arquivo dela. Fica registrado no histórico de alterações com o motivo. */
  excluirNota(id: string, motivo: string, por: string): Promise<void>

  salvarFornecedor(f: Fornecedor, por: string): Promise<Fornecedor>
  salvarContrato(c: Contrato, por: string): Promise<Contrato>

  /** Cria (id vazio) ou edita a requisição. O status muda só por mudarStatusRequisicao. */
  salvarRequisicao(r: Requisicao, por: string): Promise<Requisicao>
  /** Muda o status, validando as regras. O motivo é obrigatório para cancelar. */
  mudarStatusRequisicao(id: string, status: StatusRequisicao, por: string, motivo?: string): Promise<Requisicao>
  /** Exclui uma requisição sem NFs. Fica no histórico de alterações com o motivo. */
  excluirRequisicao(id: string, motivo: string, por: string): Promise<void>

  /** Libera ou muda o nível de acesso de um e-mail. */
  salvarAcesso(a: Acesso, por: string): Promise<void>
  /** Tira o acesso de um e-mail. */
  removerAcesso(email: string, por: string): Promise<void>

  /** URL temporária para abrir o arquivo da nota, ou null se não houver. */
  urlDoArquivo(notaId: string): Promise<string | null>

  /** Só no modo de demonstração: volta aos dados de exemplo. */
  restaurarExemplo?(): Promise<void>
}

export class ErroDeRegra extends Error {}
