-- ============================================================
-- NUCLEUS EVENT LOG -- organization scoping
-- ============================================================
-- FIXED: originally "create table if not exists nucleus_events (...)"
-- with columns (organization_id, subsystem, name, version, payload,
-- created_at). nucleus_events already existed by this point
-- (20260824_nucleus_core.sql: id, source, type, context, payload,
-- timestamp) and rpc_log_event() (20260824_nucleus_rpc.sql) inserts by
-- explicit column list against that real shape -- "create table if not
-- exists" silently no-opped, so organization_id never landed and the
-- "idx_events_org"/"idx_events_name" indexes below would fail against
-- columns that don't exist ("name" was never a real column; the real
-- equivalent is "type").
--
-- This adds only the genuinely missing, additive piece (organization_id,
-- nullable since existing/rpc inserts don't supply it) rather than
-- also introducing "name"/"version" columns nothing writes to, or
-- renaming "source"/"type"/"timestamp", which would break
-- rpc_log_event().
-- ============================================================

alter table nucleus_events add column if not exists organization_id text;

create index if not exists idx_events_org on nucleus_events (organization_id);
