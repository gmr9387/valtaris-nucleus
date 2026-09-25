-- Real, live, pre-existing bug found while verifying the RLS perf fix
-- (20260925110000) actually works for a real authenticated session, not
-- just checking the policy text changed. Same class as dualpay's
-- risk #101 (RISK_REGISTER.md): `authenticated` had zero EXECUTE grant
-- on the SECURITY DEFINER choke-point functions every RLS policy in
-- this schema routes through -- confirmed live via
-- has_function_privilege('authenticated', ..., 'EXECUTE') = false for
-- is_org_member/has_org_role/project_org, and reproduced directly: any
-- authenticated-role SELECT against public.organizations throws
-- `42501: permission denied for function is_org_member` instead of
-- returning RLS-filtered rows.
--
-- Confirmed via regexp scan of every public-schema policy's qual/with_check
-- text that only these 3 functions are actually invoked from within a
-- policy expression (the other SECURITY DEFINER functions in this schema
-- -- credential_org, environment_project, is_environment_in_org/_project,
-- is_project_in_org, scope_matches_org_project_environment -- are used
-- inside trigger functions/CHECK constraints, which fire regardless of
-- the calling role's EXECUTE grant, so they don't need this). Every
-- policy that calls these 3 is scoped `TO authenticated` specifically
-- (organizations, projects, credentials, connector_bindings,
-- environments, workflows, workflow_runs, workflow_steps,
-- workflow_versions, workflow_audit_events, organization_members,
-- organization_sso_configs), so `anon` intentionally does not get this
-- grant.
grant execute on function public.is_org_member(uuid, uuid) to authenticated;
grant execute on function public.has_org_role(uuid, uuid, app_role[]) to authenticated;
grant execute on function public.project_org(uuid) to authenticated;
