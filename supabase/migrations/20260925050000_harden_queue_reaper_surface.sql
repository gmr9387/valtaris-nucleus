-- Fixes two real, live vulnerabilities in the queue-reaper surface added
-- by 20260925020000_nucleus_queue_reaper.sql this same session, caught by
-- Supabase's own security advisor (get_advisors) rather than assumed:
--
-- 1. `public.reap_stuck_queue_messages(interval)` was created without any
--    REVOKE/GRANT statements. Postgres grants EXECUTE on a new function
--    to PUBLIC by default, which in Supabase means `anon` -- i.e. anyone
--    on the internet, no auth required -- could call it directly via
--    POST /rest/v1/rpc/reap_stuck_queue_messages and force-requeue or
--    terminally fail any organization's stuck queue messages. Confirmed
--    live: has_function_privilege('anon', ..., 'EXECUTE') = true before
--    this fix. Same class of bug the harden_public_rpc_surface migration
--    already fixed for claim_next_queue_job/recover_stalled_queue_jobs --
--    this new function was just never brought under that pattern.
--
-- 2. `public.nucleus_queue_dead_letters` is a view created by a
--    privileged role (postgres) without `security_invoker = true`. Under
--    Postgres's default view semantics that makes it run with the
--    view OWNER's privileges when queried, not the querying role's --
--    functionally equivalent to SECURITY DEFINER for RLS purposes, since
--    postgres bypasses RLS. Combined with anon/authenticated both having
--    a SELECT grant on it (same default-PUBLIC-grant gap as #1), this
--    meant an unauthenticated caller could read every organization's
--    failed queue messages -- including `payload`, which can carry
--    claim/PHI-adjacent data -- via GET /rest/v1/nucleus_queue_dead_letters,
--    completely bypassing nucleus_queue_messages' own RLS policy
--    (service-role-full-queue-messages: auth.role() = 'service_role').
--    Confirmed live before fixing: anon/authenticated both held SELECT
--    (and even DELETE/INSERT/UPDATE/TRUNCATE) on the view.

revoke all on function public.reap_stuck_queue_messages(interval) from public, anon, authenticated;
grant execute on function public.reap_stuck_queue_messages(interval) to service_role;

alter view public.nucleus_queue_dead_letters set (security_invoker = true);

revoke all on public.nucleus_queue_dead_letters from public, anon, authenticated;
grant select on public.nucleus_queue_dead_letters to service_role;
