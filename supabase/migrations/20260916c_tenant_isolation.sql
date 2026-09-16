-- ============================================================
-- TENANT ISOLATION — wiring the organization_id plumbing that
-- 20260914_claims_core.sql's own header explicitly deferred:
-- "organization_id columns exist so that isolation can be tightened
-- later without a schema change ... once that plumbing exists." This
-- is that plumbing.
-- ============================================================
-- Two separate concerns, both closed here:
--
-- 1. External API tenant isolation (the one that actually matters for
--    selling to multiple customers via adjudicate-claim/weaver-score/
--    guardian-status): api_clients gets an organization_id. Each
--    external caller's API key belongs to exactly one tenant. The
--    three Edge Functions (see their repo.ts changes in this same
--    commit) resolve the caller's organization_id from their API key
--    and filter every contract/plan/accumulator/rule lookup by it.
--    This is enforced in application code, not RLS -- Edge Functions
--    hold the service-role key, which bypasses RLS entirely.
--
-- 2. Admin UI tenant isolation: payer_contracts/plan_benefits/
--    member_accumulators/weaver_rules had "authenticated-only" RLS
--    (any signed-in user sees everything) because nothing upstream
--    set organization_id. Replaced with real org-scoped policies
--    below, using the same organization_members/has_org_role pattern
--    manage-api-clients already uses -- not the auth.jwt() custom-
--    claim pattern in 20260828_rls_policies.sql, which needs a custom
--    access-token hook this project has no evidence of configuring.
--
-- A NULL organization_id is treated as shared/global data, visible to
-- every tenant -- this is what every existing row is today (all
-- verified NULL before this migration), so nothing already in
-- production loses access. Isolation activates the moment a row is
-- actually assigned to an organization.
-- ============================================================

-- ---------- organization_id: text -> uuid, real FK ----------
-- Safe as a straight type change: every existing row in all four
-- tables has organization_id = NULL (verified before writing this
-- migration) -- there is no non-null text value that could fail to
-- cast.

alter table payer_contracts
  alter column organization_id type uuid using organization_id::uuid,
  add constraint payer_contracts_organization_id_fkey
    foreign key (organization_id) references organizations(id) on delete set null;

alter table plan_benefits
  alter column organization_id type uuid using organization_id::uuid,
  add constraint plan_benefits_organization_id_fkey
    foreign key (organization_id) references organizations(id) on delete set null;

alter table member_accumulators
  alter column organization_id type uuid using organization_id::uuid,
  add constraint member_accumulators_organization_id_fkey
    foreign key (organization_id) references organizations(id) on delete set null;

alter table weaver_rules
  alter column organization_id type uuid using organization_id::uuid,
  add constraint weaver_rules_organization_id_fkey
    foreign key (organization_id) references organizations(id) on delete set null;

-- ---------- api_clients: which tenant does this API key belong to ----------

alter table api_clients
  add column organization_id uuid references organizations(id) on delete set null;

create index if not exists idx_api_clients_organization on api_clients (organization_id);
create index if not exists idx_payer_contracts_organization on payer_contracts (organization_id);
create index if not exists idx_plan_benefits_organization on plan_benefits (organization_id);
create index if not exists idx_member_accumulators_organization on member_accumulators (organization_id);
create index if not exists idx_weaver_rules_organization on weaver_rules (organization_id);

-- ---------- Replace blanket "authenticated-only" RLS with org-scoped policies ----------

drop policy if exists "authenticated-rw-payer-contracts" on payer_contracts;
drop policy if exists "authenticated-rw-plan-benefits" on plan_benefits;
drop policy if exists "authenticated-rw-member-accumulators" on member_accumulators;
drop policy if exists "authenticated-rw-weaver-rules" on weaver_rules;

-- SELECT: any signed-in member of the row's organization, or anyone
-- signed in at all when the row has no organization (shared/global
-- data -- see this file's header).
create policy "org-scoped-select-payer-contracts" on payer_contracts
  for select using (
    organization_id is null
    or exists (
      select 1 from organization_members om
      where om.organization_id = payer_contracts.organization_id and om.user_id = auth.uid()
    )
  );

create policy "org-scoped-select-plan-benefits" on plan_benefits
  for select using (
    organization_id is null
    or exists (
      select 1 from organization_members om
      where om.organization_id = plan_benefits.organization_id and om.user_id = auth.uid()
    )
  );

create policy "org-scoped-select-member-accumulators" on member_accumulators
  for select using (
    organization_id is null
    or exists (
      select 1 from organization_members om
      where om.organization_id = member_accumulators.organization_id and om.user_id = auth.uid()
    )
  );

create policy "org-scoped-select-weaver-rules" on weaver_rules
  for select using (
    organization_id is null
    or exists (
      select 1 from organization_members om
      where om.organization_id = weaver_rules.organization_id and om.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: manager-or-above membership in the target
-- organization, or unscoped (organization_id left null, same
-- shared-data convention as select). Mirrors manage-api-clients's own
-- owner/admin bar for mutations, one notch more permissive (manager
-- included) since these are working adjudication-data tables an
-- operator role edits day to day, not credentials.
create policy "org-scoped-write-payer-contracts" on payer_contracts
  for all using (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  ) with check (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  );

create policy "org-scoped-write-plan-benefits" on plan_benefits
  for all using (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  ) with check (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  );

create policy "org-scoped-write-member-accumulators" on member_accumulators
  for all using (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  ) with check (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  );

create policy "org-scoped-write-weaver-rules" on weaver_rules
  for all using (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  ) with check (
    organization_id is null
    or public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
  );
