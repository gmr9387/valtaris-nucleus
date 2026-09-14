-- ============================================================
-- PLAN BENEFITS — real persistence for PlanBenefits (@/types/claim)
-- ============================================================
-- Closes the gap noted in src/lib/live-stubs.ts / src/engine/contract-to-terms.ts:
-- payer_contracts (fee schedules) already had real, Supabase-backed
-- persistence (20260914_claims_core.sql), but plan benefits (deductible,
-- OOP max, coinsurance, copay, benefit limits) did not -- production
-- claims fell back to LIVE_PLAN (an intentionally empty stub) for every
-- member-responsibility calculation. This table + @/lib/plan-benefits.ts +
-- @/engine/plan-benefits-to-terms.ts mirror the payer_contracts pattern
-- exactly so a real plan can be looked up by payer the same way a real
-- contract already is.
-- ============================================================

create table if not exists plan_benefits (
  plan_id uuid primary key default gen_random_uuid(),
  organization_id text,
  payer_name text not null,
  plan_name text not null,
  version text not null,
  plan_year integer not null,
  effective_date date not null,
  termination_date date,
  deductible_individual integer not null default 0,
  deductible_family integer not null default 0,
  oop_max_individual integer not null default 0,
  oop_max_family integer not null default 0,
  coinsurance_rate numeric not null default 0,
  copay_amount integer,
  copay_applies_to jsonb,
  cob_policy text not null default 'standard'
    check (cob_policy in ('standard', 'non_duplication', 'carve_out', 'maintenance_of_benefits')),
  covered_services jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_plan_benefits_payer on plan_benefits (payer_name);

alter table plan_benefits enable row level security;

create policy "authenticated-rw-plan-benefits" on plan_benefits for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
