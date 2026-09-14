-- ============================================================
-- CLAIMS RECOVERY PLATFORM — CORE SCHEMA
-- ============================================================
-- Backs the claims-workbench / EDI-gateway feature
-- (src/pages/ClaimsWorkbench.tsx, src/lib/edi-gateway.ts, and
-- everything under src/engine/*, src/lib/contracts.ts,
-- src/data/repository.ts). None of these tables previously existed —
-- that code was written against a schema that was never migrated.
--
-- RLS here is authenticated-only (no per-organization filter), because
-- nothing upstream (rowToClaim, ClaimsWorkbench, ingestEdiFile) threads
-- an organization_id through yet. organization_id columns exist so that
-- isolation can be tightened later without a schema change — see the
-- org-isolation policies in 20260828_rls_policies.sql for the pattern
-- to follow once that plumbing exists.
-- ============================================================

-- ---------- Member benefit accumulators (real, not demo) ----------

create table if not exists member_accumulators (
  member_id text not null,
  plan_year integer not null,
  organization_id text,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (member_id, plan_year)
);

-- ---------- Payer contracts + fee schedules (Phase 15) ----------

create table if not exists payer_contracts (
  contract_id uuid primary key default gen_random_uuid(),
  organization_id text,
  payer_name text not null,
  version text not null,
  effective_date date not null,
  termination_date date,
  reimbursement_method text not null check (reimbursement_method in ('fee_schedule', 'percent_of_billed')),
  percent_of_billed numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_payer_contracts_payer on payer_contracts (payer_name);

create table if not exists fee_schedules (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references payer_contracts (contract_id) on delete cascade,
  procedure_code text not null,
  contracted_amount_cents integer not null,
  unique (contract_id, procedure_code)
);

create index if not exists idx_fee_schedules_contract on fee_schedules (contract_id);

-- ---------- EDI gateway (Phase 21) ----------

create table if not exists edi_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  org_id text,
  transaction_type text not null,
  file_name text not null,
  sender_id text,
  receiver_id text,
  interchange_control_number text,
  functional_group_number text,
  transaction_set_number text,
  status text not null default 'received' check (status in ('received', 'validated', 'rejected', 'normalized')),
  validation_status text not null default 'invalid' check (validation_status in ('valid', 'invalid')),
  segment_count integer not null default 0,
  error_count integer not null default 0,
  raw_content text not null,
  metadata jsonb,
  received_at timestamptz not null default now()
);

create index if not exists idx_edi_transactions_received on edi_transactions (received_at desc);

create table if not exists edi_segments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references edi_transactions (transaction_id) on delete cascade,
  segment_type text not null,
  sequence_number integer not null,
  raw_segment text not null,
  parsed_json jsonb
);

create index if not exists idx_edi_segments_transaction on edi_segments (transaction_id, sequence_number);

create table if not exists edi_errors (
  error_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references edi_transactions (transaction_id) on delete cascade,
  severity text not null check (severity in ('error', 'warning')),
  error_code text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_edi_errors_transaction on edi_errors (transaction_id);

-- ---------- Claims, cases, adjudication runs, disputes ----------

create table if not exists claims (
  claim_id text primary key,
  organization_id text,
  case_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_claims_case on claims (case_id);

create table if not exists cases (
  case_id text primary key,
  organization_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists case_events (
  event_id text primary key,
  case_id text not null references cases (case_id) on delete cascade,
  organization_id text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_case_events_case on case_events (case_id);

create table if not exists adjudication_runs (
  run_id text primary key,
  claim_id text not null,
  organization_id text,
  run jsonb not null,
  trace jsonb not null,
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_adjudication_runs_claim on adjudication_runs (claim_id, created_at desc);

create table if not exists disputes (
  dispute_id uuid primary key default gen_random_uuid(),
  claim_id text not null,
  organization_id text,
  payer_name text not null,
  procedure_code text,
  contract_id uuid references payer_contracts (contract_id),
  allowed_cents integer not null,
  paid_cents integer not null,
  shortfall_cents integer not null,
  basis text not null,
  confidence numeric not null,
  status text not null default 'open' check (status in ('open', 'submitted', 'won', 'lost', 'withdrawn')),
  created_at timestamptz not null default now()
);

create index if not exists idx_disputes_claim on disputes (claim_id);

-- ---------- Ops events (lightweight activity feed) ----------

create table if not exists ops_events (
  id uuid primary key default gen_random_uuid(),
  organization_id text,
  kind text not null,
  summary text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ops_events_created on ops_events (created_at desc);

-- ============================================================
-- RLS — authenticated-only, no org filter yet (see header note)
-- ============================================================

alter table member_accumulators enable row level security;
alter table payer_contracts enable row level security;
alter table fee_schedules enable row level security;
alter table edi_transactions enable row level security;
alter table edi_segments enable row level security;
alter table edi_errors enable row level security;
alter table claims enable row level security;
alter table cases enable row level security;
alter table case_events enable row level security;
alter table adjudication_runs enable row level security;
alter table disputes enable row level security;
alter table ops_events enable row level security;

create policy "authenticated-rw-member-accumulators" on member_accumulators for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-payer-contracts" on payer_contracts for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-fee-schedules" on fee_schedules for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-edi-transactions" on edi_transactions for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-edi-segments" on edi_segments for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-edi-errors" on edi_errors for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-claims" on claims for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-cases" on cases for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-case-events" on case_events for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-adjudication-runs" on adjudication_runs for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-disputes" on disputes for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "authenticated-rw-ops-events" on ops_events for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
