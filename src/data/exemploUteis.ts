// Linhas de exemplo da aba Úteis. Códigos, pessoas e textos são inventados.

import type { Util } from '../domain/tipos'

type Linha = Omit<Util, 'id'>

const VIP: Linha[] = [
  { ambiente: 'vip', secao: 'centros', titulo: 'Sala VIP (geral)', valor: '306.002', obs: 'Limpeza, gás, escritório e serviços' },
  { ambiente: 'vip', secao: 'centros', titulo: 'Alimentação: café e padaria', valor: '306.003', obs: '' },
  { ambiente: 'vip', secao: 'centros', titulo: 'Alimentação: bebidas e frios', valor: '306.004', obs: '' },
  { ambiente: 'vip', secao: 'centros', titulo: 'Alimentação: buffet e hortifruti', valor: '306.005', obs: '' },
  { ambiente: 'vip', secao: 'centros', titulo: 'Confeitaria', valor: '306.006', obs: '' },
  { ambiente: 'vip', secao: 'contatos', titulo: 'Comercial (dono do processo)', valor: 'comercial@exemplo.com', obs: 'Dúvidas sobre notas, fornecedores e pagamentos' },
  { ambiente: 'vip', secao: 'contatos', titulo: 'Fiscal', valor: 'fiscal@exemplo.com', obs: 'Só o Comercial abre chamado; não enviar NF direto' },
  {
    ambiente: 'vip',
    secao: 'orientacoes',
    titulo: 'Antes de enviar a NF',
    valor:
      'Confira se o CNPJ da nota é o mesmo do pedido, se o valor bate com o combinado e se o vencimento dá pelo menos 15 dias antes da quinta de pagamento. Nota com CNPJ diferente volta para o fornecedor.',
    obs: '',
  },
  {
    ambiente: 'vip',
    secao: 'orientacoes',
    titulo: 'Quando o fornecedor recebe',
    valor: 'Os pagamentos saem nas quintas do dia 1 ao 21. A previsão de cada nota aparece ao preencher o vencimento.',
    obs: '',
  },
]

const COMERCIAL: Linha[] = [
  { ambiente: 'comercial', secao: 'centros', titulo: 'Administrativo Comercial', valor: '410.01', obs: '' },
  { ambiente: 'comercial', secao: 'centros', titulo: 'Novos negócios', valor: '410.02', obs: '' },
  { ambiente: 'comercial', secao: 'centros', titulo: 'Vendas e mídia', valor: '410.03', obs: '' },
  { ambiente: 'comercial', secao: 'centros', titulo: 'Arquitetura', valor: '410.04', obs: 'Projetos e softwares de obra' },
  { ambiente: 'comercial', secao: 'centros', titulo: 'Áreas externas', valor: '410.05', obs: 'Estacionamento e acessos' },
  { ambiente: 'comercial', secao: 'aprovadores', titulo: 'Ana', valor: 'A1', obs: 'Arquitetura e projetos' },
  { ambiente: 'comercial', secao: 'aprovadores', titulo: 'Bruno', valor: 'B2', obs: 'Novos negócios' },
  { ambiente: 'comercial', secao: 'aprovadores', titulo: 'Carla', valor: 'C3', obs: 'Vendas e mídia' },
  { ambiente: 'comercial', secao: 'recorrentes', titulo: 'ObraFácil Software · mensalidade', valor: 'RC 4500049848 · pedido 4700095964', obs: '30 dias · renova todo ano em março' },
  { ambiente: 'comercial', secao: 'recorrentes', titulo: 'Contêiner Planalto · aluguel', valor: 'RC 4500049922 · pedido 4700096046', obs: 'Mensal, na entrega · contrato de 12 meses' },
  {
    ambiente: 'comercial',
    secao: 'orientacoes',
    titulo: 'Abrir RC de fornecedor preferencial',
    valor:
      'No texto da RC, informe: descrição da atividade, valor da proposta, código SAP do fornecedor e que é fornecedor preferencial com acordo já fechado com Comercial e Compras. Assim qualquer comprador gera o pedido mais rápido.',
    obs: '',
  },
  {
    ambiente: 'comercial',
    secao: 'orientacoes',
    titulo: 'NF recusada',
    valor: 'Motivo mais comum: CNPJ da NF diferente do CNPJ do pedido. Peça a NF corrigida ao fornecedor antes de lançar a folha.',
    obs: '',
  },
]

export const exemploUteis = (): Util[] => [...VIP, ...COMERCIAL].map((u, i) => ({ ...u, id: `u${i + 1}` }))
