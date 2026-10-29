# Portal NF · Sala VIP

Portal para a Sala VIP enviar notas fiscais ao Comercial e acompanhar cada nota até o pagamento,
com indicadores para a gestão.

> **Modo demonstração:** por enquanto não há banco de dados nem login de verdade. Os dados são
> fictícios e ficam guardados só no navegador de quem está usando.

## Como rodar no seu computador

1. Instale o [Node.js](https://nodejs.org) (versão LTS).
2. Na pasta do projeto, rode no terminal:
   ```
   npm install
   npm run dev
   ```
3. Abra http://localhost:5173 no navegador.

## O que já funciona

- **Login de teste e níveis de acesso:** Sala VIP, Notas Comercial (operador), Comercial (admin) e Gestão.
  O admin libera e muda acessos em Cadastros › Usuários.
- **Notas Sala VIP:** envio de NF com anexo e previsão de pagamento, fila do Comercial com etapas,
  pendências, urgentes e histórico, painel e úteis.
- **Notas Comercial:** requisições de compra (RC → pedido → NFs), lançamento de NF a partir do pedido,
  painel com saldo dos pedidos e úteis.
- **Cadastros:** fornecedores, contratos básicos, usuários e histórico de alterações.
- **Regra das quintas:** faixa no topo com a próxima abertura de chamado e os próximos pagamentos.

## Para a TI

Veja [`docs/para-a-ti.md`](docs/para-a-ti.md): o que o código faz, o que falta para produção e as perguntas em aberto.

Veja `CLAUDE.md` para a arquitetura e as regras do processo.
