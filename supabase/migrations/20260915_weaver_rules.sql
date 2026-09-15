-- ============================================================
-- WEAVER RULES — real, configurable decisioning for the Weaver arm
-- ============================================================
-- Closes the gap between nucleus's WeaverRuntime (a single hardcoded
-- scoring formula) and the real, configurable rules-engine ambition
-- the ecosystem's "Decision Weaver" product already demonstrates
-- (rules, facts, weighted confidence, governance). Rather than calling
-- out to that separate, uncredentialed SaaS prototype, this brings the
-- same design in natively -- nucleus is the "octopus head" and should
-- own its own decisioning arm rather than depend on a fragile external
-- service for a core adjudication signal.
--
-- The default rows below exactly reproduce weaverRuntime.ts's previous
-- hardcoded recommendation-confidence weights (0.3 / 0.15 / 0.15) as
-- real, editable data instead of an if-chain -- nothing about existing
-- claim behavior changes on migration, only where the numbers live.
-- ============================================================

create table if not exists weaver_rules (
  rule_id uuid primary key default gen_random_uuid(),
  organization_id text,
  stage text not null check (stage in ('opportunity', 'recommendation')),
  name text not null,
  field_path text not null,
  operator text not null check (operator in (
    'exists', 'not_exists', 'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
    'nonempty_string', 'nonempty_array', 'contains', 'in'
  )),
  value jsonb,
  weight numeric not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_weaver_rules_stage on weaver_rules (stage, enabled);

alter table weaver_rules enable row level security;

create policy "authenticated-rw-weaver-rules" on weaver_rules for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

insert into weaver_rules (stage, name, field_path, operator, value, weight) values
  ('recommendation', 'Has procedure code', 'claimPayload.procedure_code', 'nonempty_string', null, 0.3),
  ('recommendation', 'Has diagnosis codes', 'claimPayload.diagnosis_codes', 'nonempty_array', null, 0.15),
  ('recommendation', 'Positive claim amount', 'claimPayload.amount', 'gt', '0', 0.15);
