-- Closes the auth_rls_initplan fix's sibling advisor finding,
-- multiple_permissive_policies (gapMap.md item 23), for this schema's
-- 3 genuinely-redundant patterns -- NOT a blind bulk rewrite; each is
-- verified behavior-preserving individually before being applied.
--
-- PATTERN 1: 12 policies are declared `TO public` but their entire
-- condition is `auth.role() = 'service_role'`. Since `service_role`
-- has BYPASSRLS and never evaluates any policy at all, and the
-- condition is unconditionally false for every other role, this
-- policy currently contributes nothing to the OR for anon/authenticated
-- -- it's pure evaluation overhead, not a real authorization path for
-- those roles. Rescoping `TO service_role` changes zero behavior (the
-- policy still never fires for service_role, since that role bypasses
-- RLS regardless of what's declared) while removing it from
-- anon/authenticated's policy set entirely.
alter policy "replay_cache_service_role_only" on public.adjudication_replay_cache to service_role;
alter policy "service-role-full-authorization" on public.authorization_contract to service_role;
alter policy "service-role-full-execution" on public.execution to service_role;
alter policy "errors_service_full" on public.nucleus_errors to service_role;
alter policy "events_service_full" on public.nucleus_events to service_role;
alter policy "identity_service_full" on public.nucleus_identity to service_role;
alter policy "service-role-full-queue-messages" on public.nucleus_queue_messages to service_role;
alter policy "subsystems_service_full" on public.nucleus_subsystems to service_role;
alter policy "telemetry_service_full" on public.nucleus_telemetry to service_role;
alter policy "service-role-full-opportunity" on public.opportunity to service_role;
alter policy "service-role-full-payment" on public.payment to service_role;
alter policy "service-role-full-recommendation" on public.recommendation to service_role;

-- PATTERN 2: member_accumulators/payer_contracts/plan_benefits/weaver_rules
-- each have an ALL "-write-" policy (has_org_role: owner/admin/manager)
-- alongside a separate SELECT "-select-" policy (broader: any org
-- member). has_org_role(...) implies organization_members membership,
-- so the write policy's SELECT contribution is a strict subset of the
-- select policy's -- fully subsumed, provably redundant. Splitting the
-- ALL policy into INSERT/UPDATE/DELETE (dropping SELECT) removes the
-- redundant evaluation with no change in who can read what; using the
-- exact original condition text verbatim to avoid any transcription risk.
drop policy "org-scoped-write-member-accumulators" on public.member_accumulators;
create policy "org-scoped-insert-member-accumulators" on public.member_accumulators for insert to public
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-update-member-accumulators" on public.member_accumulators for update to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])))
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-delete-member-accumulators" on public.member_accumulators for delete to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));

drop policy "org-scoped-write-payer-contracts" on public.payer_contracts;
create policy "org-scoped-insert-payer-contracts" on public.payer_contracts for insert to public
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-update-payer-contracts" on public.payer_contracts for update to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])))
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-delete-payer-contracts" on public.payer_contracts for delete to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));

drop policy "org-scoped-write-plan-benefits" on public.plan_benefits;
create policy "org-scoped-insert-plan-benefits" on public.plan_benefits for insert to public
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-update-plan-benefits" on public.plan_benefits for update to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])))
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-delete-plan-benefits" on public.plan_benefits for delete to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));

drop policy "org-scoped-write-weaver-rules" on public.weaver_rules;
create policy "org-scoped-insert-weaver-rules" on public.weaver_rules for insert to public
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-update-weaver-rules" on public.weaver_rules for update to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])))
  with check (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));
create policy "org-scoped-delete-weaver-rules" on public.weaver_rules for delete to public
  using (((organization_id IS NULL) OR has_org_role(organization_id, ( SELECT auth.uid() AS uid), ARRAY['owner'::app_role, 'admin'::app_role, 'manager'::app_role])));

-- PATTERN 3: organization_sso_configs' SELECT policy
-- (sso_configs_select_admins) and its ALL policy (sso_configs_write_admins)
-- have byte-identical conditions -- the SELECT policy contributes
-- nothing the ALL policy doesn't already cover. Drop the redundant one.
drop policy "sso_configs_select_admins" on public.organization_sso_configs;
