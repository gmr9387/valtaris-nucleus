-- ============================================================
-- RLS FOR nucleus_identity
-- ============================================================

alter table nucleus_identity enable row level security;

-- Service role: full access
create policy "identity_service_full"
  on nucleus_identity
  for all
  using (auth.role() = 'service_role');

-- Tenant-scoped access
create policy "identity_tenant_read"
  on nucleus_identity
  for select
  using (tenant_id = auth.jwt()->>'tenant_id');

create policy "identity_tenant_insert"
  on nucleus_identity
  for insert
  with check (tenant_id = auth.jwt()->>'tenant_id');


-- ============================================================
-- RLS FOR nucleus_events
-- ============================================================

alter table nucleus_events enable row level security;

create policy "events_service_full"
  on nucleus_events
  for all
  using (auth.role() = 'service_role');

create policy "events_tenant_read"
  on nucleus_events
  for select
  using (context->>'tenantId' = auth.jwt()->>'tenant_id');

create policy "events_tenant_insert"
  on nucleus_events
  for insert
  with check (context->>'tenantId' = auth.jwt()->>'tenant_id');


-- ============================================================
-- RLS FOR nucleus_telemetry
-- ============================================================

alter table nucleus_telemetry enable row level security;

create policy "telemetry_service_full"
  on nucleus_telemetry
  for all
  using (auth.role() = 'service_role');

create policy "telemetry_tenant_read"
  on nucleus_telemetry
  for select
  using (metadata->>'tenantId' = auth.jwt()->>'tenant_id');

create policy "telemetry_tenant_insert"
  on nucleus_telemetry
  for insert
  with check (metadata->>'tenantId' = auth.jwt()->>'tenant_id');


-- ============================================================
-- RLS FOR nucleus_errors
-- ============================================================

alter table nucleus_errors enable row level security;

create policy "errors_service_full"
  on nucleus_errors
  for all
  using (auth.role() = 'service_role');

create policy "errors_tenant_read"
  on nucleus_errors
  for select
  using (context->>'tenantId' = auth.jwt()->>'tenant_id');

create policy "errors_tenant_insert"
  on nucleus_errors
  for insert
  with check (context->>'tenantId' = auth.jwt()->>'tenant_id');


-- ============================================================
-- RLS FOR nucleus_subsystems
-- ============================================================

alter table nucleus_subsystems enable row level security;

create policy "subsystems_service_full"
  on nucleus_subsystems
  for all
  using (auth.role() = 'service_role');

-- Subsystems are global — only service role should modify them
create policy "subsystems_global_read"
  on nucleus_subsystems
  for select
  using (true);
