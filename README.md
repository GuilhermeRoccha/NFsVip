# Portal NF · Sala VIP

Portal interno para receber notas fiscais (NFs) de fornecedores da Sala VIP e acompanhar cada nota
até o pagamento, com indicadores para a gestão. Substitui o controle atual por e-mail, Excel,
pasta de rede e WhatsApp.

> **Versão de demonstração.** Ainda não há banco de dados nem login de verdade. Os dados são
> fictícios e ficam guardados só no navegador de quem usa. Nenhuma informação é enviada a servidor.

## Tecnologias

| Tecnologia | Para que serve |
| --- | --- |
| [React 19](https://react.dev) | Biblioteca das telas (componentes) |
| [TypeScript](https://www.typescriptlang.org) | JavaScript com tipos, para pegar erros antes de rodar |
| [Vite 8](https://vite.dev) | Servidor de desenvolvimento e geração do site final (`dist/`) |
| CSS puro (`src/index.css`) | Visual, com variáveis de cor e tema claro/escuro |
| [Vitest](https://vitest.dev) | Testes automáticos das regras de negócio |
| [oxlint](https://oxc.rs) | Verificação de qualidade do código (lint) |
| `localStorage` + IndexedDB | Onde os dados e os anexos ficam guardados nesta versão (no navegador) |

Dependências em produção: só `react` e `react-dom`. O resultado do build é um **site estático**
(HTML, CSS e JavaScript), que pode ser hospedado em qualquer servidor web.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) 20 ou mais novo (versão LTS recomendada).

```bash
npm install      # instala as dependências (uma vez)
npm run dev      # abre em http://localhost:5173
npm test         # roda os testes
npm run lint     # verifica o código
npm run build    # gera a versão de produção na pasta dist/
npm run preview  # serve a pasta dist/ localmente para conferir o build
```

Para entrar, use um dos e-mails de teste listados na tela de login (lista em Cadastros › Usuários).

## Estrutura do código

```
index.html               página base (carrega src/main.tsx)
public/                  arquivos estáticos (ícone)
src/
  main.tsx               ponto de entrada do React
  App.tsx                topo, navegação entre ambientes e abas, controle de acesso
  estado.tsx             contexto React: dados carregados, usuário logado e ações
  index.css              estilos e temas
  domain/                regras de negócio, sem tela, com testes (*.test.ts)
    tipos.ts             tipos de dados (nota, fornecedor, contrato, requisição, usuário...)
    etapas.ts            etapas da nota e o que cada uma exige
    regras.ts            calendário: chamados às quintas, pagamentos nas quintas do dia 1 ao 21
    contratos.ts         saldo e alerta dos contratos básicos
    requisicoes.ts       fluxo das requisições de compra (RC → pedido → NF)
    acesso.ts            níveis de acesso e o que cada um vê
    ajuda.ts, uteis.ts   conteúdo da ajuda e da aba Úteis
  data/                  acesso a dados
    armazenamento.ts     interface única entre as telas e os dados
    armazenamentoLocal.ts  implementação atual (navegador)
    arquivosLocais.ts    anexos das NFs no IndexedDB
    exemplo*.ts          dados fictícios de demonstração
  pages/                 telas (SalaVip, Comercial, Requisicoes, Cadastros, Gestao, Uteis)
  components/            partes reaproveitadas das telas (detalhe da nota, login, status...)
  lib/formato.ts         formatação de datas e valores em reais
supabase/schema.sql      rascunho do banco de dados (Postgres) para a versão de produção
docs/
  para-a-ti.md           resumo para avaliação da TI: estado atual, o que falta, perguntas
  arquitetura.md         processo, perfis, ambientes e decisões de arquitetura
```

**Ponto principal da arquitetura:** as telas nunca acessam os dados direto. Elas passam pela
interface `Armazenamento` (`src/data/armazenamento.ts`). Para ligar o portal a um banco de verdade,
basta escrever outra implementação dessa interface e trocar em `src/data/index.ts`, sem mexer nas telas.

## O que o portal faz

- **Login de teste e níveis de acesso:** Sala VIP, Notas Comercial (operador), Comercial (admin) e Gestão.
- **Notas Sala VIP:** envio de NF com anexo e previsão de pagamento; fila do Comercial com as etapas
  Recebida → Conferida → OC emitida → MIGO/Folha → De acordo → Chamado aberto → Paga, cada uma
  com data, hora e responsável; pendências, notas urgentes e histórico.
- **Notas Comercial:** requisições de compra (RC → pedido → NFs) e lançamento de NF a partir do pedido.
- **Cadastros:** fornecedores, contratos básicos, usuários e histórico de alterações.
- **Painéis de gestão:** valores, prazos, tempo por etapa e saldo dos contratos.
- **SAP fica de fora:** o portal só guarda os números (OC, folha, chamado).

## Para a TI

Veja [`docs/para-a-ti.md`](docs/para-a-ti.md): o que falta para produção (banco, login corporativo,
permissões no servidor, hospedagem, LGPD) e as perguntas em aberto.
