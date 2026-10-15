-- RASCUNHO do banco no Supabase (Postgres). Ainda não aplicado em lugar nenhum.
-- Espelha os tipos de src/domain/tipos.ts. Revisar antes de usar.

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
  valor numeric(14,2) not null check (valor > 0),
  ativo boolean not null default true
);

create table notas (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id),
  numero text not null,
  valor numeric(14,2) not null check (valor > 0),
  emissao date not null,
  vencimento date not null,
  contrato text not null default '',
  centro_custo text not null default '',
  oc text not null default '',
  folha text not null default '',
  chamado text not null default '',
  pendencia text not null default '',
  arquivo_caminho text,          -- caminho no bucket privado "notas" do Storage
  arquivo_nome text not null default '',
  unique (fornecedor_id, numero) -- impede NF duplicada
);

-- Cada entrada numa etapa. A etapa atual é a última; o SLA sai daqui.
create table nota_etapas (
  id bigint generated always as identity primary key,
  nota_id uuid not null references notas(id) on delete cascade,
  etapa text not null check (etapa in ('recebida','conferida','oc','migo','acordo','chamado','paga')),
  em timestamptz not null default now(),
  por uuid references auth.users(id)
);

-- Auditoria de alterações em notas e cadastros.
create table alteracoes (
  id bigint generated always as identity primary key,
  entidade text not null,        -- 'nota' | 'fornecedor' | 'contrato'
  entidade_id uuid not null,
  descricao text not null,
  em timestamptz not null default now(),
  por uuid references auth.users(id)
);

-- Perfil de cada usuário logado.
create table perfis (
  usuario_id uuid primary key references auth.users(id),
  nome text not null,
  perfil text not null check (perfil in ('vip','comercial','gestao'))
);

-- Próximo passo: ligar Row Level Security (RLS) em todas as tabelas e criar
-- políticas por perfil (ex.: Sala VIP só insere notas; Comercial edita; Gestão só lê).
