-- Pack Registry Table
create table if not exists public.pack_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  description text not null,
  capabilities jsonb not null,
  entrypoint text not null,
  publisher text not null,
  compatibility jsonb null,
  dependencies jsonb null,
  resource_limits jsonb null,
  version_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pack_registry_name_idx on public.pack_registry (name);
create index if not exists pack_registry_version_idx on public.pack_registry (version);
