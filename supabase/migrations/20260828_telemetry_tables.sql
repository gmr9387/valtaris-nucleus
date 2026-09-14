-- ============================================================
-- NUCLEUS TELEMETRY TABLE -- organization scoping
-- ============================================================
-- FIXED: same pattern as the error-table, event-log, and
-- subsystem-registry fixes above. nucleus_telemetry already existed
-- (20260824_nucleus_core.sql: id, subsystem, level, message, metadata,
-- timestamp) and rpc_log_telemetry() inserts against that exact column
-- list without organization_id -- "create table if not exists" here
-- silently no-opped, so the intended organization_id column, and the
-- "idx_telemetry_org" index against it, never actually landed.
-- ============================================================

alter table nucleus_telemetry add column if not exists organization_id text;

create index if not exists idx_telemetry_org on nucleus_telemetry (organization_id);
