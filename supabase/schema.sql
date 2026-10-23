-- Banco do Portal NF Sala VIP no Supabase (Postgres).
-- Como aplicar: no painel do Supabase, abra "SQL Editor", cole este arquivo inteiro e clique em "Run".
-- Espelha os tipos de src/domain/tipos.ts. Rodar uma vez só, num projeto novo.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

-- Perfil de cada pessoa que pode entrar. Quem não está aqui faz login mas não vê nada.
-- Para liberar alguém: Authentication > Users > "Invite user", depois inserir uma linha aqui.
create table perfis (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  perfil text not null check (perfil in ('vip', 'comercial', 'gestao'))
);

create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  razao_social text not null default '',
  cnpj text not null default '',
  codigo_sap text not null default '',
  tipo text not null default '',
  centro_custo text not null default '',
  ativo boolean not null default true
);

create table contratos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  fornecedor_id uuid not null references fornecedores(id),
  valor numeric(14, 2) not null check (valor > 0),
  ativo boolean not null default true
);

create table notas (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id),
  numero text not null,
  valor numeric(14, 2) not null check (valor > 0),
  emissao date not null,
  vencimento date not null,
  contrato text not null default '',
  centro_custo text not null default '',
  oc text not null default '',
  folha text not null default '',
  chamado text not null default '',
  pendencia text not null default '',
  arquivo_nome text not null default '',
  arquivo_caminho text not null default '', -- caminho no bucket privado "notas"
  unique (fornecedor_id, numero)            -- impede NF duplicada
);

-- Cada entrada numa etapa. A etapa atual é a última; o tempo de cada etapa sai daqui.
create table nota_etapas (
  id bigint generated always as identity primary key,
  nota_id uuid not null references notas(id) on delete cascade,
  etapa text not null check (etapa in ('recebida', 'conferida', 'oc', 'migo', 'acordo', 'chamado', 'paga')),
  em timestamptz not null default now(),
  por text not null,
  usuario_id uuid default auth.uid()
);
create index on nota_etapas (nota_id);

-- Toda nota nova já nasce na etapa "Recebida", na mesma gravação (nunca fica nota sem etapa).
create function registrar_recebida() returns trigger
language plpgsql set search_path = public
as $$
begin
  insert into nota_etapas (nota_id, etapa, por)
  values (new.id, 'recebida', coalesce((select nome from perfis where usuario_id = auth.uid()), 'Sala VIP'));
  return new;
end $$;

create trigger nota_recebida after insert on notas
  for each row execute function registrar_recebida();

-- Alterações de dados de uma nota (valor, OC, pendência...).
create table nota_alteracoes (
  id bigint generated always as identity primary key,
  nota_id uuid not null references notas(id) on delete cascade,
  em timestamptz not null default now(),
  por text not null,
  descricao text not null,
  usuario_id uuid default auth.uid()
);
create index on nota_alteracoes (nota_id);

-- Histórico de alterações de cadastro e exclusões de nota (tela Cadastros > Histórico).
create table auditoria (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  por text not null,
  entidade text not null check (entidade in ('nota', 'fornecedor', 'contrato')),
  descricao text not null,
  usuario_id uuid default auth.uid()
);

-- ---------------------------------------------------------------------------
-- Permissões (Row Level Security): cada perfil só faz o que deve.
--   Sala VIP: vê tudo, envia notas.
--   Comercial: vê e edita tudo, exclui notas.
--   Gestão: só vê.
-- ---------------------------------------------------------------------------

create function meu_perfil() returns text
language sql stable security definer set search_path = public
as $$ select perfil from perfis where usuario_id = auth.uid() $$;

alter table perfis enable row level security;
alter table fornecedores enable row level security;
alter table contratos enable row level security;
alter table notas enable row level security;
alter table nota_etapas enable row level security;
alter table nota_alteracoes enable row level security;
alter table auditoria enable row level security;

-- Cada pessoa lê o próprio perfil; o Comercial lê todos.
create policy "ler perfil" on perfis for select to authenticated
  using (usuario_id = auth.uid() or meu_perfil() = 'comercial');

-- Leitura: qualquer pessoa com perfil.
create policy "ler" on fornecedores for select to authenticated using (meu_perfil() is not null);
create policy "ler" on contratos for select to authenticated using (meu_perfil() is not null);
create policy "ler" on notas for select to authenticated using (meu_perfil() is not null);
create policy "ler" on nota_etapas for select to authenticated using (meu_perfil() is not null);
create policy "ler" on nota_alteracoes for select to authenticated using (meu_perfil() is not null);
create policy "ler" on auditoria for select to authenticated using (meu_perfil() is not null);

-- Cadastros: só o Comercial.
create policy "comercial grava" on fornecedores for insert to authenticated with check (meu_perfil() = 'comercial');
create policy "comercial edita" on fornecedores for update to authenticated using (meu_perfil() = 'comercial');
create policy "comercial grava" on contratos for insert to authenticated with check (meu_perfil() = 'comercial');
create policy "comercial edita" on contratos for update to authenticated using (meu_perfil() = 'comercial');

-- Notas: Sala VIP e Comercial enviam; só o Comercial edita e exclui.
create policy "enviar" on notas for insert to authenticated with check (meu_perfil() in ('vip', 'comercial'));
create policy "comercial edita" on notas for update to authenticated using (meu_perfil() = 'comercial');
create policy "comercial exclui" on notas for delete to authenticated using (meu_perfil() = 'comercial');

-- Etapas: a Sala VIP só registra o recebimento; o Comercial avança as demais.
create policy "registrar etapa" on nota_etapas for insert to authenticated
  with check (meu_perfil() = 'comercial' or (meu_perfil() = 'vip' and etapa = 'recebida'));

create policy "comercial registra" on nota_alteracoes for insert to authenticated with check (meu_perfil() = 'comercial');
create policy "comercial registra" on auditoria for insert to authenticated with check (meu_perfil() = 'comercial');

-- ---------------------------------------------------------------------------
-- Arquivos das NFs: bucket privado "notas". Só abre com login, por link temporário.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('notas', 'notas', false);

create policy "ler arquivos" on storage.objects for select to authenticated
  using (bucket_id = 'notas' and meu_perfil() is not null);
create policy "enviar arquivos" on storage.objects for insert to authenticated
  with check (bucket_id = 'notas' and meu_perfil() in ('vip', 'comercial'));
create policy "comercial apaga arquivos" on storage.objects for delete to authenticated
  using (bucket_id = 'notas' and meu_perfil() = 'comercial');
