// Interface única de acesso aos dados. As telas só falam com ela.
// Hoje existe uma implementação que guarda tudo no navegador (armazenamentoLocal.ts).
// Quando o Supabase for escolhido, criamos armazenamentoSupabase.ts com os mesmos
// métodos e trocamos em data/index.ts, sem mexer nas telas.

import type { Contrato, Fornecedor, Nota, NovaNota, RegistroAuditoria } from '../domain/tipos'

export interface Dados {
  notas: Nota[]
  fornecedores: Fornecedor[]
  contratos: Contrato[]
  auditoria: RegistroAuditoria[]
}

export interface Armazenamento {
  carregar(): Promise<Dados>

  /** Cria a nota na etapa "Recebida" e guarda o arquivo, se houver. */
  enviarNota(nova: NovaNota, arquivo: File | null, por: string): Promise<Nota>
  /** Atualiza campos da nota e registra a alteração. */
  atualizarNota(id: string, campos: Partial<Nota>, por: string): Promise<Nota>
  /** Move a nota para a próxima etapa. Valida as regras antes. */
  avancarEtapa(id: string, por: string): Promise<Nota>

  /** Exclui a nota e o arquivo dela. Fica registrado no histórico de alterações com o motivo. */
  excluirNota(id: string, motivo: string, por: string): Promise<void>

  salvarFornecedor(f: Fornecedor, por: string): Promise<Fornecedor>
  salvarContrato(c: Contrato, por: string): Promise<Contrato>

  /** URL temporária para abrir o arquivo da nota, ou null se não houver. */
  urlDoArquivo(notaId: string): Promise<string | null>

  /** Só no modo de demonstração: volta aos dados de exemplo. */
  restaurarExemplo?(): Promise<void>
}

export class ErroDeRegra extends Error {}
