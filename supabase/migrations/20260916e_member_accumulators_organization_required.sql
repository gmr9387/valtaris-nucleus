-- Unlike contracts/plans/rules, a member's accumulator totals are
-- never legitimately "shared" data across tenants -- there is no
-- sensible meaning to a global deductible-used total for a member ID
-- that could belong to different tenants' different members.
-- organization_id here is therefore required, not optional like the
-- other three tables 20260916c_tenant_isolation.sql scopes. Safe:
-- table has 0 rows (also required for the widened primary key in
-- 20260916d, which cannot contain a null column).
alter table member_accumulators alter column organization_id set not null;
