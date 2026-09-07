-- ============================================================
-- NUCLEUS IDENTITY TABLE
-- ============================================================

create table if not exists nucleus_identity (
  id uuid primary key,
  tenant_id text not null,
  project_id text not null,
  environment text not null,
  actor jsonb not null,
  timestamp timestamptz default now()
);

-- Indexes
create index if not exists idx_identity_tenant on nucleus_identity (tenant_id);
create index if not exists idx_identity_project on nucleus_identity (project_id);
create index if not exists idx_identity_environment on nucleus_identity (environment);


-- ============================================================
-- NUCLEUS EVENTS TABLE
-- ============================================================

create table if not exists nucleus_events (
  id uuid primary key,
  source text not null,
  type text not null,
  context jsonb not null,
  payload jsonb not null,
  timestamp timestamptz default now()
);

-- Indexes
create index if not exists idx_events_source on nucleus_events (source);
create index if not exists idx_events_type on nucleus_events (type);
create index if not exists idx_events_timestamp on nucleus_events (timestamp);


-- ============================================================
-- NUCLEUS TELEMETRY TABLE
-- ============================================================

create table if not exists nucleus_telemetry (
  id uuid primary key,
  subsystem text not null,
  level text not null,
  message text not null,
  metadata jsonb,
  timestamp timestamptz default now()
);

-- Indexes
create index if not exists idx_telemetry_subsystem on nucleus_telemetry (subsystem);
create index if not exists idx_telemetry_level on nucleus_telemetry (level);
create index if not exists idx_telemetry_timestamp on nucleus_telemetry (timestamp);


-- ============================================================
-- NUCLEUS ERRORS TABLE
-- ============================================================

create table if not exists nucleus_errors (
  id uuid primary key,
  subsystem text not null,
  code text not null,
  message text not null,
  context jsonb,
  timestamp timestamptz default now()
);

-- Indexes
create index if not exists idx_errors_subsystem on nucleus_errors (subsystem);
create index if not exists idx_errors_code on nucleus_errors (code);
create index if not exists idx_errors_timestamp on nucleus_errors (timestamp);


-- ============================================================
-- NUCLEUS SUBSYSTEM REGISTRY TABLE
-- ============================================================

create table if not exists nucleus_subsystems (
  id text primary key,
  runtime boolean default false,
  definition boolean default false,
  health boolean default false,
  telemetry boolean default false,
  events boolean default false,
  contracts boolean default false,
  timestamp timestamptz default now()
);

-- Indexes
create index if not exists idx_subsystems_timestamp on nucleus_subsystems (timestamp);
