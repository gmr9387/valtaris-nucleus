-- ============================================================
-- NUCLEUS SUBSYSTEM REGISTRY -- organization scoping
-- ============================================================
-- FIXED: same pattern as the error-table and event-log fixes above.
-- nucleus_subsystems already existed (20260824_nucleus_core.sql: id,
-- runtime, definition, health, telemetry, events, contracts, timestamp)
-- and rpc_register_subsystem() inserts against that exact column list
-- without organization_id -- "create table if not exists" here
-- silently no-opped, so the intended organization_id column, and the
-- "idx_subsystems_org" index against it, never actually landed.
-- ============================================================

alter table nucleus_subsystems add column if not exists organization_id text;

create index if not exists idx_subsystems_org on nucleus_subsystems (organization_id);
