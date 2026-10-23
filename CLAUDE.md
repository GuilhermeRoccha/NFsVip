# Portal NF · Sala VIP

Portal interno para receber e acompanhar notas fiscais (NFs) de fornecedores da Sala VIP,
do recebimento ao pagamento. Substitui o fluxo de e-mail + Excel + pasta do Windows + WhatsApp.

## Quem usa
- **Sala VIP**: envia a NF (anexo, fornecedor, nº, emissão, vencimento, valor).
- **Comercial** (dono do processo): confere, preenche OC, MIGO/folha e chamado, avança etapas, mantém os cadastros.
- **Gestão**: acompanha valores, prazo, ciclo médio, gargalos e saldo dos contratos básicos.

## Processo (fonte: fluxograma da Sala VIP)
Etapas, nesta ordem (`src/domain/etapas.ts`):
Recebida → Conferida → OC emitida → MIGO/Folha → De acordo → Chamado aberto → Paga.
- Cada avanço grava data, hora e responsável. É a base do SLA.
- OC, MIGO/Folha e Chamado precisam estar preenchidos para entrar na etapa correspondente.
- Nota com pendência não avança.
- **Chamados só às quintas. Pagamento só nas quintas das 3 primeiras semanas do mês (dia 1–21).**
  Regra em `src/domain/regras.ts`, ainda a confirmar com o Comercial.
- SAP fica fora do sistema: o portal só guarda os números (OC, folha, chamado).

## Stack
- React 19 + TypeScript + Vite. CSS puro em `src/index.css` (variáveis de cor, tema escuro automático).
- Testes: Vitest (`npm test`). Lint: oxlint (`npm run lint`).
- Hospedagem: Vercel. Banco, arquivos e login: Supabase. Passo a passo em `docs/supabase-e-vercel.md`.

## Arquitetura
- `src/domain/`: tipos, etapas e regras de negócio. Sem React, fácil de testar.
- `src/data/armazenamento.ts`: interface `Armazenamento`, o único caminho das telas até os dados.
  - `armazenamentoLocal.ts`: modo demonstração, guarda no `localStorage` e os arquivos no IndexedDB.
  - `armazenamentoSupabase.ts`: banco e bucket privado "notas" no Supabase. Usado quando há
    `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (`.env.local` ou Vercel); sem elas, modo demonstração.
  - `comum.ts`: validações e textos de histórico usados pelos dois, para se comportarem igual.
- `src/components/Entrada.tsx`: login por link no e-mail (só com Supabase); o perfil vem da tabela `perfis`.
- `src/estado.tsx`: contexto React com os dados carregados, perfil escolhido e ações.
- `src/pages/`: uma tela por perfil (SalaVip, Comercial, Cadastros, Gestao).
- `supabase/schema.sql`: tabelas e permissões (RLS) por perfil. Permissão se garante no banco, não na tela.

## Convenções
- Código, nomes e textos de tela em **português**.
- Regras de negócio ficam em `src/domain/` com teste; telas só chamam.
- Nunca colocar credenciais no código. Variáveis em `.env.local` (fora do git).
- O dono do projeto está aprendendo: em cada PR, explicar em linguagem simples o que mudou e por quê.

## Comandos
```
npm install      # uma vez
npm run dev      # abre em http://localhost:5173
npm test         # testes
npm run build    # gera a versão de produção em dist/
```
