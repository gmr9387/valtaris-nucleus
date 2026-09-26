-- guardian_kill_switch previously had a single ALL policy gated only on
-- auth.uid() IS NOT NULL -- any authenticated user (not just owner/admin
-- of any org) could flip the platform-wide circuit breaker that halts
-- every organization's claims processing. The admin UI already gates
-- the toggle client-side on canManageOrg (owner/admin), per
-- src/routes/_app.contracts.tsx's GuardianKillSwitchTab comment ("A kill
-- switch halts all claims processing -- a stricter gate than the other
-- tabs (owner/admin only, not manager)") -- this migration makes that
-- the real, server-enforced rule instead of a client-side-only one.
--
-- Read stays open to any signed-in user (status display is not
-- sensitive). Write (UPDATE) now requires the caller to be owner/admin
-- in at least one organization -- matching the switch's genuinely
-- global/platform-wide scope (it has no organization_id column to scope
-- a check to a specific org, same rationale already applied to
-- api_clients per ADR-004). No INSERT/DELETE policy is added: the
-- single 'global' row is seeded once by this table's own creation
-- migration, and RLS-enabled-with-no-policy correctly denies both by
-- default for every non-service_role caller.
--
-- Already applied and verified live: pg_policies confirms the new
-- policy text matches exactly what this file creates.
DROP POLICY "authenticated-rw-guardian-kill-switch" ON public.guardian_kill_switch;

CREATE POLICY "authenticated-read-guardian-kill-switch" ON public.guardian_kill_switch
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "org-admin-update-guardian-kill-switch" ON public.guardian_kill_switch
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  );
