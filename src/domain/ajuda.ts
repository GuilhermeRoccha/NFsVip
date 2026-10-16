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
  { perfil: 'Sala VIP', faz: 'Envia a nota fiscal e acompanha em que etapa cada nota está.' },
  {
    perfil: 'Comercial',
    faz: 'Dono do processo. Confere, preenche OC, MIGO/folha e chamado, avança as etapas e mantém fornecedores e contratos em Cadastros.',
  },
  { perfil: 'Gestão', faz: 'Acompanha valores, prazos, tempo em cada etapa, gargalos e saldo dos contratos básicos.' },
]

export const GLOSSARIO: [termo: string, significado: string][] = [
  ['NF', 'Nota fiscal do fornecedor.'],
  ['OC', 'Ordem de compra, emitida por Compras no SAP.'],
  ['MIGO / Folha', 'Registro no SAP de que o material chegou (MIGO) ou o serviço foi prestado (folha de serviço).'],
  ['De acordo', 'Aprovação da Sala VIP de que pode pagar.'],
  ['Chamado', 'Pedido aberto para o Fiscal lançar a nota e liberar o pagamento.'],
  ['Contrato básico', 'Contrato com valor total; cada nota consome parte do saldo.'],
  ['Pendência', 'Problema na nota (dado errado, arquivo faltando). Enquanto existir, a nota não avança.'],
  ['Janela de pagamento', 'Próxima quinta em que há pagamento. A nota precisa ter chamado antes dela.'],
]
