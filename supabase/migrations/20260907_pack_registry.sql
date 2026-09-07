-- Pack Registry
create table if not exists public.pack_registry (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null,
  pack_name text not null,
  pack_version text not null,
  pack_description text,
  installed boolean not null default false,
  installed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists pack_registry_pack_id_idx
  on public.pack_registry (pack_id);

-- Pack Version History
create table if not exists public.pack_versions (
  id uuid primary key default gen_random_uuid(),
  pack_id text not null,
  version text not null,
  changelog text,
  created_at timestamptz not null default now()
);

create index if not exists pack_versions_pack_id_idx
  on public.pack_versions (pack_id);
