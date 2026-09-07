-- Extension Registry Table
create table if not exists public.extension_registry (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.pack_registry(id) on delete cascade,
  name text not null,
  version text not null,
  description text not null,
  hooks jsonb not null,
  entrypoint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists extension_registry_pack_idx on public.extension_registry (pack_id);
create index if not exists extension_registry_name_idx on public.extension_registry (name);
create index if not exists extension_registry_version_idx on public.extension_registry (version);
