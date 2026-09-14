-- ============================================================
-- NUCLEUS ERROR TABLE -- organization scoping
-- ============================================================
-- FIXED: originally "create table if not exists nucleus_errors (...)"
-- with an organization_id column and a created_at column. nucleus_errors
-- already existed by this point (20260824_nucleus_core.sql: id,
-- subsystem, code, message, context, timestamp -- no organization_id).
-- "create table if not exists" silently no-ops against an existing
-- table instead of erroring, so the intended organization_id column
-- never actually landed, and the "idx_errors_org" index this file went
-- on to create against it would fail outright (column doesn't exist).
-- rpc_log_error() (20260824_nucleus_rpc.sql) inserts by explicit column
-- list without organization_id and writes to "timestamp", not
-- "created_at" -- so this only adds the genuinely missing column
-- (nullable, since existing/rpc inserts don't supply it) rather than
-- also renaming "timestamp", which would break that function.
-- ============================================================

alter table nucleus_errors add column if not exists organization_id text;

create index if not exists idx_errors_org on nucleus_errors (organization_id);
