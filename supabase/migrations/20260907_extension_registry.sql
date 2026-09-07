-- Extension Registry
create table if not exists public.extension_registry (
  id uuid primary key default gen_random_uuid(),
  extension_id text not null,
  extension_name text not null,
  extension_version text not null,
  extension_description text,
  installed boolean not null default false,
  installed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists extension_registry_id_idx
  on public.extension_registry (extension_id);

-- Extension Version History
create table if not exists public.extension_versions (
  id uuid primary key default gen_random_uuid(),
  extension_id text not null,
  version text not null,
  changelog text,
  created_at timestamptz not null default now()
);

create index if not exists extension_versions_id_idx
  on public.extension_versions (extension_id);
