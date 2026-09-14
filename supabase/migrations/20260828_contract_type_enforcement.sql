-- ============================================================
-- CONTRACT TYPE ENFORCEMENT (OPTIONAL)
-- ============================================================
-- FIXED: this failed to apply at all -- "authorization" is a reserved
-- SQL keyword (used unquoted on line 16 of the original), and the real
-- table (created by 20260828_nucleus_core.sql) is named
-- authorization_contract, not authorization. It also used
-- "for insert using (...)" -- Postgres requires "with check" for INSERT
-- policies; USING is only valid for SELECT/UPDATE/DELETE.
--
-- Left otherwise unchanged: these are PERMISSIVE policies (Postgres
-- default), so they OR together with the existing
-- "org-isolation-*-insert" policies from 20260828_rls_policies.sql
-- rather than narrowing them -- an insert succeeds if either check
-- passes. That widens access rather than "enforcing" a stricter type
-- check, which is presumably not what "(OPTIONAL)" enforcement was
-- meant to do; flagging rather than silently redesigning it into a
-- restrictive policy, since that would be a real behavior change beyond
-- the syntax fix asked for.

-- Weaver can only emit opportunity + recommendation
create policy "weaver-contracts"
  on opportunity
  for insert with check (auth.jwt()->>'subsystem' = 'weaver');

create policy "weaver-contracts-rec"
  on recommendation
  for insert with check (auth.jwt()->>'subsystem' = 'weaver');

-- Guardian can only emit authorization
create policy "guardian-contracts"
  on authorization_contract
  for insert with check (auth.jwt()->>'subsystem' = 'guardian');

-- Glue can only emit execution
create policy "glue-contracts"
  on execution
  for insert with check (auth.jwt()->>'subsystem' = 'glue');

-- DualPay can only emit payment
create policy "dualpay-contracts"
  on payment
  for insert with check (auth.jwt()->>'subsystem' = 'dualpay');
