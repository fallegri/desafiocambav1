-- Esquema base de Desafío Camba (Neon Postgres).
-- Idempotente: se puede correr varias veces sin romper nada.

do $$ begin
  create type user_role as enum ('superadmin', 'operador', 'participante');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('pendiente', 'activo', 'rechazado', 'bloqueado');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text not null,
  role user_role not null default 'participante',
  status user_status not null default 'pendiente',
  approved_by uuid references users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_idx on users (lower(email));
create index if not exists users_status_idx on users (status);
create index if not exists users_role_idx on users (role);

create table if not exists game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  category_id text not null,
  score integer not null default 0 check (score >= 0),
  max_score integer not null default 0 check (max_score >= 0),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_results_user_idx on game_results (user_id, created_at desc);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  label text not null,
  points integer not null default 0,
  achieved_at timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists achievements_user_idx on achievements (user_id, achieved_at desc);

-- Contenido generado por el asistente IA (Fase 2). Se deja creada desde ya
-- para que la migración sea una sola.
create table if not exists ai_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('trivia', 'no_se_dice', 'cancion')),
  payload jsonb not null,
  provider text not null,
  model text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  created_by uuid references users(id) on delete set null,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Evolución del esquema: bases creadas antes de la Fase 2 no tienen estas
-- columnas ni aceptan el tipo 'no_se_dice'.
alter table ai_content add column if not exists batch_id uuid;
alter table ai_content add column if not exists topic text;
alter table ai_content add column if not exists note text;

do $$ begin
  alter table ai_content drop constraint if exists ai_content_kind_check;
  alter table ai_content add constraint ai_content_kind_check
    check (kind in ('trivia', 'no_se_dice', 'cancion'));
exception when duplicate_object then null; end $$;

create index if not exists ai_content_status_idx on ai_content (status, created_at desc);
create index if not exists ai_content_batch_idx on ai_content (batch_id);
create index if not exists ai_content_kind_status_idx on ai_content (kind, status);

create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log (created_at desc);
