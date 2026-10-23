# Ligar o portal no Supabase e na Vercel

Passo a passo para tirar o portal do modo demonstração. Faça uma vez só.
Use dados fictícios até a TI aprovar dados reais.

## 1. Criar o projeto no Supabase

1. Entre em https://supabase.com e clique em **Start your project**. Use **Continue with GitHub**.
2. Clique em **New project**.
   - Nome: `portal-nf-sala-vip`.
   - Senha do banco: clique em **Generate a password** e guarde num lugar seguro. O portal não usa essa senha.
   - Região: **South America (São Paulo)**.
   - Plano: **Free**.
3. Espere uns dois minutos até o projeto ficar pronto.

## 2. Criar as tabelas

1. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
2. Cole o arquivo [`supabase/schema.sql`](../supabase/schema.sql) inteiro e clique em **Run**.
3. Deve aparecer "Success. No rows returned".

## 3. Configurar o login

1. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Assim só entra quem você convidar.
2. Em **Authentication → URL Configuration**:
   - **Site URL**: por enquanto, `http://localhost:5173`. Depois do passo 6, troque pelo endereço da Vercel.
   - Em **Redirect URLs**, adicione:
     - `http://localhost:5173/**`
     - `https://*.app.github.dev/**` (Codespaces)
     - `https://*.vercel.app/**` (Vercel)

## 4. Liberar o seu acesso

1. Em **Authentication → Users**, clique em **Add user → Send invitation** e coloque o seu e-mail.
2. Volte ao **SQL Editor** e rode, trocando o e-mail:

```sql
insert into perfis (usuario_id, nome, perfil)
select id, 'Guilherme', 'comercial' from auth.users where email = 'seu-email@empresa.com';
```

Para cada pessoa nova, repita os dois passos. O perfil pode ser `vip` (Sala VIP), `comercial` ou `gestao`.

## 5. Pegar as duas chaves

Em **Project Settings → API Keys** (ou **Data API**), copie:
- a **Project URL** (`https://xxxx.supabase.co`);
- a **Publishable key** (`sb_publishable_...`). Em projetos antigos, ela se chama **anon public**.

Essas duas podem ficar no navegador. Quem protege os dados são as permissões do banco.
**Nunca** use a **secret key**, nem a **service_role**, no portal, e nunca mande essas chaves em chat.

Para testar no Codespaces, crie o arquivo `.env.local` na raiz do projeto, copiando o `.env.example`, e preencha as duas linhas. Pare o `npm run dev` com `Ctrl+C` e rode de novo.

## 6. Publicar na Vercel

1. Entre em https://vercel.com e use **Continue with GitHub**. Plano **Hobby** para testar.
2. Clique em **Add New → Project** e importe o repositório `NFsVip`.
3. Em **Environment Variables**, adicione as duas do passo 5:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Clique em **Deploy**. No fim, aparece o endereço, algo como `https://nfsvip.vercel.app`.
5. Volte ao Supabase (passo 3) e coloque esse endereço em **Site URL**.

A partir daí, cada proposta juntada no `main` publica sozinha na Vercel.
