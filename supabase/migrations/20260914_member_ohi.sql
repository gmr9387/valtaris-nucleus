-- ============================================================
-- MEMBER OTHER-HEALTH-INSURANCE (OHI) — real persistence for
-- OHIIndicator (@/types/claim)
-- ============================================================
-- Closes a gap noted alongside the COB primacy engine
-- (src/nucleus/subsystems/guardian/adjudication/cobRules.ts,
-- resolveClaimPrimacy): that engine is real and tested, but nothing
-- populated claim.ohi_indicators from a live data path -- it only had
-- the one seeded demo claim. There is no eligibility-verification or
-- clearinghouse integration to source this from yet, so this is real,
-- persisted, queryable member-level OHI data fed by direct entry (the
-- same starting point a COB questionnaire result would be recorded
-- from), not a fabricated integration.
-- ============================================================

create table if not exists member_ohi (
  member_id text not null,
  payer_id text not null,
  organization_id text,
  payer_name text not null,
  coverage_type text not null,
  primacy_order integer,
  subscriber_id text,
  group_number text,
  updated_at timestamptz not null default now(),
  primary key (member_id, payer_id)
);

create index if not exists idx_member_ohi_member on member_ohi (member_id);

alter table member_ohi enable row level security;

create policy "authenticated-rw-member-ohi" on member_ohi for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
