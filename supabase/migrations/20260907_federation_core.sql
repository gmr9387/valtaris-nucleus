-- Cluster Registry
create table if not exists public.cluster_registry (
  id uuid primary key default gen_random_uuid(),
  cluster_name text not null,
  cluster_code text not null,
  trust_anchor_id uuid not null,
  federation_public_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cluster_registry_code_idx on public.cluster_registry (cluster_code);

-- Region Registry
create table if not exists public.region_registry (
  id uuid primary key default gen_random_uuid(),
  region_name text not null,
  region_code text not null,
  cluster_id uuid not null references public.cluster_registry(id) on delete cascade,
  cluster_url text not null,
  status text not null check (status in ('active','inactive','degraded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists region_registry_code_idx on public.region_registry (region_code);
create index if not exists region_registry_cluster_idx on public.region_registry (cluster_id);

-- Region Heartbeat
create table if not exists public.region_heartbeat (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.region_registry(id) on delete cascade,
  cluster_id uuid not null references public.cluster_registry(id) on delete cascade,
  status text not null check (status in ('active','inactive','degraded')),
  emitted_at timestamptz not null default now(),
  health_signature text not null
);

create index if not exists region_heartbeat_region_idx on public.region_heartbeat (region_id);
create index if not exists region_heartbeat_cluster_idx on public.region_heartbeat (cluster_id);

-- Federation Signatures
create table if not exists public.federation_signature (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.cluster_registry(id) on delete cascade,
  region_id uuid references public.region_registry(id) on delete set null,
  subject_type text not null,
  subject_id uuid not null,
  signature text not null,
  created_at timestamptz not null default now()
);

create index if not exists federation_signature_subject_idx
  on public.federation_signature (subject_type, subject_id);
