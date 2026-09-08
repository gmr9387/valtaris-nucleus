-- ============================================================
-- RLS POLICIES (fixed)
-- ============================================================
-- Previous version only defined "for select" policies on every
-- table, with a "with check" clause that is a no-op on select
-- policies (with check only applies to insert/update). That
-- meant no authenticated user could ever write a row into any
-- of these tables under RLS -- only service_role bypass could.
-- This version adds explicit insert/update policies alongside
-- the existing select policies for every contract table.
-- ============================================================

alter table opportunity enable row level security;
alter table recommendation enable row level security;
alter table authorization_contract enable row level security;
alter table execution enable row level security;
alter table payment enable row level security;

alter table nucleus_lineage enable row level security;
alter table nucleus_subsystems enable row level security;
alter table nucleus_telemetry enable row level security;
alter table nucleus_errors enable row level security;
alter table nucleus_events enable row level security;

-- ============================================================
-- Organization isolation: SELECT
-- ============================================================

create policy "org-isolation-opportunity-select"
  on opportunity
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-recommendation-select"
  on recommendation
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-authorization-select"
  on authorization_contract
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-execution-select"
  on execution
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-payment-select"
  on payment
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

-- ============================================================
-- Organization isolation: INSERT
-- ============================================================

create policy "org-isolation-opportunity-insert"
  on opportunity
  for insert with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-recommendation-insert"
  on recommendation
  for insert with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-authorization-insert"
  on authorization_contract
  for insert with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-execution-insert"
  on execution
  for insert with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-payment-insert"
  on payment
  for insert with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

-- ============================================================
-- Organization isolation: UPDATE
-- ============================================================

create policy "org-isolation-opportunity-update"
  on opportunity
  for update
  using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-recommendation-update"
  on recommendation
  for update
  using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-authorization-update"
  on authorization_contract
  for update
  using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-execution-update"
  on execution
  for update
  using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-payment-update"
  on payment
  for update
  using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id');

-- ============================================================
-- Service role: full access (bypass for background workers)
-- ============================================================

create policy "service-role-full-opportunity"
  on opportunity for all using (auth.role() = 'service_role');

create policy "service-role-full-recommendation"
  on recommendation for all using (auth.role() = 'service_role');

create policy "service-role-full-authorization"
  on authorization_contract for all using (auth.role() = 'service_role');

create policy "service-role-full-execution"
  on execution for all using (auth.role() = 'service_role');

create policy "service-role-full-payment"
  on payment for all using (auth.role() = 'service_role');
