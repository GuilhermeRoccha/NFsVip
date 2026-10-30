# Portal NF: resumo para avaliação da TI

Protótipo interno feito pelo Comercial para trocar o controle atual de notas fiscais de fornecedores
(e-mail, Excel, pasta de rede e WhatsApp) por um portal único. Este documento resume o que o código
faz hoje, o que ele **não** faz ainda e o que precisaria para ir para produção.

## Estado atual

- **Só front-end, sem servidor.** É um site estático (HTML, CSS e JavaScript) gerado com `npm run build`.
- **Dados fictícios.** Nenhum dado real da empresa está no código. Os exemplos são gerados por
  `src/data/exemplo*.ts`.
- **Os dados ficam no navegador de quem usa** (`localStorage`, e os anexos no IndexedDB). Não há
  envio de dados para nenhum servidor. Limpar o navegador apaga tudo.
- **O login é só de teste.** A pessoa entra pelo e-mail, sem senha, desde que ele esteja na lista
  de Usuários. Serve para mostrar os níveis de acesso; não é seguro e não deve ser usado com dado real.
- **Único acesso externo:** as fontes do Google Fonts, carregadas pelo `index.html`. Podem ser
  hospedadas junto com o site, se a política exigir.

## Tecnologia

| Item | Uso |
| --- | --- |
| React 19 + TypeScript | Telas |
| Vite 8 | Gera o site (`npm run build` → pasta `dist/`) |
| Vitest | Testes das regras de negócio (`npm test`) |
| oxlint | Verificação de código (`npm run lint`) |

Dependências em produção: só `react` e `react-dom`. `npm audit`: 0 vulnerabilidades (29/10/2026).
Requer Node.js 20 ou mais novo para gerar o site.

```
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # site pronto em dist/
```

## O que o portal faz

- **Dois ambientes:** Notas Sala VIP (a Sala VIP envia a NF e o Comercial trata até o pagamento) e
  Notas Comercial (requisições de compra do próprio Comercial: RC → pedido → NFs).
- **Etapas da nota com data, hora e responsável:** Recebida → Conferida → OC → MIGO/Folha →
  De acordo → Chamado → Paga. Regras de calendário (chamados às quintas; pagamentos nas quintas
  do dia 1 ao 21) em `src/domain/regras.ts`.
- **Níveis de acesso:** Sala VIP, Notas Comercial (operador), Comercial (admin) e Gestão.
  Regra em `src/domain/acesso.ts`.
- **Histórico:** toda alteração de nota, requisição, cadastro e acesso fica registrada com quem fez.
- **Painéis** de valores, prazos e tempo por etapa; exportação para o Excel por copiar e colar.
- **SAP fica de fora:** o portal só guarda os números (OC, folha, chamado). Não há integração.

## Como o código está organizado

- `src/domain/`: regras de negócio, sem tela, com testes.
- `src/data/armazenamento.ts`: a **interface única de acesso a dados**. As telas só falam com ela.
  Hoje a implementação é `armazenamentoLocal.ts` (navegador). Para produção, basta escrever outra
  implementação da mesma interface, ligada ao banco escolhido, sem mexer nas telas.
- `src/pages/` e `src/components/`: telas.
- `supabase/schema.sql`: rascunho de banco (Postgres) com as tabelas e permissões por perfil.
  Existe também um rascunho de integração com Supabase guardado no ramo `supabase-base`, fora desta versão.

## O que falta para produção

1. **Banco de dados e armazenamento de arquivos** no lugar do navegador (Postgres ou o que a TI indicar).
2. **Login de verdade**, de preferência com a conta corporativa (por exemplo, Microsoft Entra ID / SSO).
3. **Permissões aplicadas no servidor**, não só na tela. O rascunho em `supabase/schema.sql` mostra
   como isso fica no banco.
4. **Hospedagem** do site (é estático) e backup do banco.
5. Revisão de LGPD: o portal guarda CNPJ e dados de fornecedores e e-mail de usuários internos.

## Perguntas para a TI

- Podemos usar um serviço de nuvem (por exemplo, Supabase ou Azure) ou precisa ser na infraestrutura da empresa?
- Qual login corporativo devemos usar?
- Há padrão de hospedagem para sistemas internos?
- Quem seria o responsável técnico pela manutenção?
