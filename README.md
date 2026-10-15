# Portal NF · Sala VIP

Portal para a Sala VIP enviar notas fiscais ao Comercial e acompanhar cada nota até o pagamento,
com indicadores para a gestão.

> **Modo demonstração:** por enquanto não há banco de dados nem login. Os dados são fictícios
> e ficam guardados só no navegador de quem está usando.

## Como rodar no seu computador

1. Instale o [Node.js](https://nodejs.org) (versão LTS).
2. Na pasta do projeto, rode no terminal:
   ```
   npm install
   npm run dev
   ```
3. Abra http://localhost:5173 no navegador.

## O que já funciona

- **Sala VIP:** envio de NF com anexo, bloqueio de NF duplicada e lista das notas enviadas com o status.
- **Comercial › Notas:** indicadores do dia, filtros, busca, tabela no formato da planilha, botão para
  copiar para o Excel, painel da nota com edição, avanço de etapa, pendências e histórico.
- **Comercial › Cadastros:** fornecedores e contratos básicos editáveis, com histórico de alterações.
- **Gestão:** valor por mês, pagas no prazo, ciclo médio, maiores fornecedores, tempo por etapa e
  saldo dos contratos básicos.
- **Regra das quintas:** faixa no topo com a próxima abertura de chamado e os próximos pagamentos.

## Próximos passos

- Escolher e configurar Supabase (banco, arquivos e login) e Vercel (hospedagem).
- Importar o histórico da planilha de 2026.
- Login por e-mail corporativo, com perfil por usuário.

Veja `CLAUDE.md` para a arquitetura e as regras do processo.
