-- ============================================================
-- RLS POLICIES
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

-- Organization isolation
create policy "org-isolation-opportunity"
  on opportunity
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-recommendation"
  on recommendation
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-authorization"
  on authorization_contract
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-execution"
  on execution
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-payment"
  on payment
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

-- Same for lineage, telemetry, errors, events
create policy "org-isolation-lineage"
  on nucleus_lineage
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-telemetry"
  on nucleus_telemetry
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-errors"
  on nucleus_errors
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');

create policy "org-isolation-events"
  on nucleus_events
  for select using (auth.uid() is not null and organization_id = auth.jwt()->>'organization_id')
  with check (organization_id = auth.jwt()->>'organization_id');
