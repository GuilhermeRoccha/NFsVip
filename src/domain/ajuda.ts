// Textos da ajuda "Como funciona o processo".
// Ficam junto das etapas para que, se o fluxo mudar, a ajuda mude no mesmo lugar.

import type { EtapaId } from './tipos'

export interface AjudaEtapa {
  /** O que acontece nesta etapa, em uma ou duas frases. */
  oQueAcontece: string
  /** Onde a etapa é feita fora do portal, quando é o caso. */
  ondeFaz?: string
  /** Regra de calendário que vale para a etapa. */
  calendario?: string
}

// Record<EtapaId, …> obriga a ter texto para todas as etapas.
export const AJUDA_ETAPAS: Record<EtapaId, AjudaEtapa> = {
  recebida: {
    oQueAcontece:
      'A Sala VIP envia a nota pelo portal com o arquivo, fornecedor, número, emissão, vencimento e valor. O portal recusa a mesma NF do mesmo fornecedor duas vezes.',
  },
  conferida: {
    oQueAcontece:
      'O Comercial confere se os dados batem com o arquivo e completa contrato básico e centro de custo. Se algo estiver errado, marca uma pendência e a nota para até ser resolvida.',
  },
  oc: {
    oQueAcontece: 'Compras emite a ordem de compra (OC) e o Comercial registra o número dela na nota.',
    ondeFaz: 'SAP',
  },
  migo: {
    oQueAcontece: 'O Comercial lança a MIGO ou a folha de serviço e registra o número na nota.',
    ondeFaz: 'SAP',
  },
  acordo: {
    oQueAcontece: 'A coordenação da Sala VIP confirma que o serviço ou produto foi entregue e aprova o pagamento.',
  },
  chamado: {
    oQueAcontece: 'O Comercial abre o chamado para o Fiscal com a nota e registra o número do chamado.',
    calendario: 'Chamados só às quintas',
  },
  paga: {
    oQueAcontece: 'Contas a pagar faz o pagamento ao fornecedor. A nota sai da fila de abertas.',
    calendario: 'Quintas do dia 1 ao 21',
  },
}

export const PAPEIS_NO_PORTAL: { perfil: string; faz: string }[] = [
  { perfil: 'Sala VIP', faz: 'Só o ambiente Notas Sala VIP: envia a nota fiscal e acompanha em que etapa cada nota está.' },
  {
    perfil: 'Comercial (admin)',
    faz: 'Dono do processo, vê os dois ambientes. Confere, preenche OC, MIGO/folha e chamado e avança as etapas. Em Notas Comercial, controla as próprias requisições e lança as NFs de cada pedido. Mantém fornecedores, contratos e usuários em Cadastros.',
  },
  { perfil: 'Notas Comercial', faz: 'Só o ambiente Notas Comercial: requisições, lançamento de NFs, painel e úteis. Não mexe em cadastros nem em usuários.' },
  { perfil: 'Gestão', faz: 'Só os painéis e os úteis dos dois ambientes: valores, prazos, tempo em cada etapa, gargalos e saldos.' },
]

export const GLOSSARIO: [termo: string, significado: string][] = [
  ['NF', 'Nota fiscal do fornecedor.'],
  ['RC', 'Requisição de compra aberta no SAP. Vira pedido depois de aprovada.'],
  ['Pedido', 'O mesmo que OC. No ambiente Notas Comercial, cada NF é lançada a partir de um pedido.'],
  ['OC', 'Ordem de compra, emitida por Compras no SAP.'],
  ['MIGO / Folha', 'Registro no SAP de que o material chegou (MIGO) ou o serviço foi prestado (folha de serviço).'],
  ['De acordo', 'Aprovação da Sala VIP de que pode pagar.'],
  ['Chamado', 'Pedido aberto para o Fiscal lançar a nota e liberar o pagamento.'],
  ['Contrato básico', 'Contrato com valor total; cada nota consome parte do saldo.'],
  ['Pendência', 'Problema na nota (dado errado, arquivo faltando). Enquanto existir, a nota não avança.'],
  ['Janela de pagamento', 'Quinta de pagamento (dia 1 a 21) em que a nota deve ser paga: a última antes do vencimento.'],
  ['Urgente', 'Nota sem chamado a menos de 15 dias da sua janela de pagamento.'],
]
