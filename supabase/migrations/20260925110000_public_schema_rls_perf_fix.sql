-- Performance advisor sweep (docs/RISK_REGISTER.md-equivalent gapMap.md
-- item 23, valtaris-nucleus): 117 RLS policies in this repo's own
-- `public` schema re-evaluate auth.uid()/auth.jwt()/auth.role() once per
-- row instead of once per query (Supabase's documented #1 RLS perf
-- anti-pattern -- see
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).
--
-- Same exact pattern already proven safe and applied to dualpay's schema
-- this same project (dualpay/20260924224814_dualpay_rls_perf_and_demo_policy_fix.sql,
-- 134 policies, full test suite passed after). Driven off the live
-- catalog rather than hand-transcribed to avoid errors across ~117
-- policies. Guard is case-insensitive on "(select auth." -- Postgres
-- normalizes stored policy text to "( SELECT auth.uid() AS uid)"
-- (uppercase SELECT, spacing, alias), and a case-sensitive guard here
-- would silently double-wrap already-fixed policies on a second run.
DO $$
DECLARE
  pol RECORD;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR pol IN
    SELECT tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    new_qual := pol.qual;
    new_check := pol.with_check;

    IF pol.qual IS NOT NULL AND pol.qual ~ 'auth\.(uid|jwt|role)\(\)' AND pol.qual !~* '\(\s*select\s+auth\.' THEN
      new_qual := regexp_replace(pol.qual, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
    END IF;

    IF pol.with_check IS NOT NULL AND pol.with_check ~ 'auth\.(uid|jwt|role)\(\)' AND pol.with_check !~* '\(\s*select\s+auth\.' THEN
      new_check := regexp_replace(pol.with_check, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
    END IF;

    IF new_qual IS NOT DISTINCT FROM pol.qual AND new_check IS NOT DISTINCT FROM pol.with_check THEN
      CONTINUE;
    END IF;

    stmt := format('ALTER POLICY %I ON public.%I', pol.policyname, pol.tablename);
    IF pol.qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF pol.with_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE stmt;
  END LOOP;
END $$;
