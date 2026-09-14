-- ============================================================
-- CONNECTORS & CREDENTIALS CORE (recovered Phase 1)
-- ============================================================
-- 20260527201308_ebde6785-...sql ("Phase 2 security + scope patch")
-- adds foreign keys and hardens RLS on credentials/credential_versions/
-- credential_rotation_events/connector_bindings, but the migration that
-- was supposed to create those tables in the first place was never
-- committed to this migrations folder (created outside migration
-- history, e.g. via the Studio table editor, and lost). The app's
-- generated Supabase types (src/integrations/supabase/types.ts) still
-- carry the full Row/Insert/Update contract for every one of these
-- tables, so this migration is not a guess -- it recreates exactly the
-- schema the app already assumes, reconstructed from that file.
--
-- Deliberately does NOT add the foreign keys or scope-consistency
-- triggers that 20260527201308 adds afterward (credentials_org_fk,
-- connector_bindings_org_fk, etc.) -- that migration expects to add
-- them itself and would fail on a duplicate constraint otherwise.
-- ============================================================

create type public.connector_category as enum ('ai','payments','messaging','social','database','universal','other');
create type public.connector_status as enum ('available','beta','deprecated');
create type public.binding_status as enum ('active','paused','error');
create type public.health_status as enum ('healthy','degraded','failed','unknown');
create type public.credential_status as enum ('active','rotating','deactivated');
create type public.rotation_reason as enum ('scheduled','manual','compromised','policy','initial');

-- ============ CONNECTORS (catalog) ============
create table public.connectors (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  category public.connector_category not null default 'other',
  status public.connector_status not null default 'available',
  supports_oauth boolean not null default false,
  supports_webhooks boolean not null default false,
  documentation_url text,
  created_at timestamptz not null default now()
);
grant select on public.connectors to authenticated;
grant all on public.connectors to service_role;
alter table public.connectors enable row level security;
create policy "connectors_select_authenticated" on public.connectors for select to authenticated using (true);

create table public.connector_versions (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.connectors(id) on delete cascade,
  version text not null,
  schema_version integer not null default 1,
  changelog text,
  created_at timestamptz not null default now()
);
create index idx_connector_versions_connector on public.connector_versions(connector_id);
grant select on public.connector_versions to authenticated;
grant all on public.connector_versions to service_role;
alter table public.connector_versions enable row level security;
create policy "connector_versions_select_authenticated" on public.connector_versions for select to authenticated using (true);

create table public.connector_capabilities (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.connectors(id) on delete cascade,
  capability_key text not null,
  capability_label text not null
);
create index idx_connector_capabilities_connector on public.connector_capabilities(connector_id);
grant select on public.connector_capabilities to authenticated;
grant all on public.connector_capabilities to service_role;
alter table public.connector_capabilities enable row level security;
create policy "connector_capabilities_select_authenticated" on public.connector_capabilities for select to authenticated using (true);

-- ============ CREDENTIAL PROVIDERS (catalog) ============
create table public.credential_providers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  category public.connector_category not null default 'other',
  supports_oauth boolean not null default false,
  supports_rotation boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.credential_providers to authenticated;
grant all on public.credential_providers to service_role;
alter table public.credential_providers enable row level security;
create policy "credential_providers_select_authenticated" on public.credential_providers for select to authenticated using (true);

-- ============ CREDENTIALS (org-scoped) ============
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid,
  environment_id uuid,
  provider_id uuid not null references public.credential_providers(id),
  label text not null,
  status public.credential_status not null default 'active',
  last_rotated_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_credentials_org on public.credentials(organization_id);
grant select, insert, update, delete on public.credentials to authenticated;
grant all on public.credentials to service_role;
alter table public.credentials enable row level security;
create policy "credentials_select_members" on public.credentials for select to authenticated
  using (public.is_org_member(organization_id, auth.uid()));
create policy "credentials_insert_managers" on public.credentials for insert to authenticated
  with check (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]));
create policy "credentials_update_managers" on public.credentials for update to authenticated
  using (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]));
create policy "credentials_delete_admins" on public.credentials for delete to authenticated
  using (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));

create table public.credential_versions (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.credentials(id) on delete cascade,
  version_number integer not null,
  encrypted_payload_ref text not null,
  redacted_preview text,
  is_active boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (credential_id, version_number)
);
create index idx_credential_versions_credential on public.credential_versions(credential_id);
grant select, insert, update on public.credential_versions to authenticated;
grant all on public.credential_versions to service_role;
alter table public.credential_versions enable row level security;
create policy "cv_select_admins" on public.credential_versions for select to authenticated
  using (
    exists (
      select 1 from public.credentials c
      where c.id = credential_id
        and public.has_org_role(c.organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
    )
  );
-- Named to match 20260527201308's "DROP POLICY IF EXISTS cv_insert_admins /
-- cv_update_admins" -- that migration is the one that locks direct client
-- writes back down to service-role-only; these exist here only so that
-- lockdown has real policies to remove, matching its documented intent.
create policy "cv_insert_admins" on public.credential_versions for insert to authenticated
  with check (
    exists (
      select 1 from public.credentials c
      where c.id = credential_id
        and public.has_org_role(c.organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
    )
  );
create policy "cv_update_admins" on public.credential_versions for update to authenticated
  using (
    exists (
      select 1 from public.credentials c
      where c.id = credential_id
        and public.has_org_role(c.organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
    )
  );

create table public.credential_rotation_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.credentials(id) on delete cascade,
  previous_version_id uuid references public.credential_versions(id),
  next_version_id uuid references public.credential_versions(id),
  rotation_reason public.rotation_reason not null default 'manual',
  triggered_by uuid not null,
  created_at timestamptz not null default now()
);
create index idx_credential_rotation_events_credential on public.credential_rotation_events(credential_id);
grant select, insert on public.credential_rotation_events to authenticated;
grant all on public.credential_rotation_events to service_role;
alter table public.credential_rotation_events enable row level security;
create policy "cre_select_admins" on public.credential_rotation_events for select to authenticated
  using (
    exists (
      select 1 from public.credentials c
      where c.id = credential_id
        and public.has_org_role(c.organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[])
    )
  );
-- Named to match 20260527201308's "DROP POLICY IF EXISTS cre_insert_admins".
create policy "cre_insert_admins" on public.credential_rotation_events for insert to authenticated
  with check (
    exists (
      select 1 from public.credentials c
      where c.id = credential_id
        and public.has_org_role(c.organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
    )
  );

-- ============ CONNECTOR BINDINGS (org-scoped) ============
create table public.connector_bindings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid,
  environment_id uuid,
  connector_id uuid not null references public.connectors(id),
  credential_id uuid references public.credentials(id),
  status public.binding_status not null default 'active',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_connector_bindings_org on public.connector_bindings(organization_id);
create index idx_connector_bindings_connector on public.connector_bindings(connector_id);
grant select, insert, update, delete on public.connector_bindings to authenticated;
grant all on public.connector_bindings to service_role;
alter table public.connector_bindings enable row level security;
create policy "connector_bindings_select_members" on public.connector_bindings for select to authenticated
  using (public.is_org_member(organization_id, auth.uid()));
create policy "connector_bindings_insert_managers" on public.connector_bindings for insert to authenticated
  with check (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]));
create policy "connector_bindings_update_managers" on public.connector_bindings for update to authenticated
  using (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager']::public.app_role[]));
create policy "connector_bindings_delete_admins" on public.connector_bindings for delete to authenticated
  using (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));

create table public.connector_health_checks (
  id uuid primary key default gen_random_uuid(),
  connector_binding_id uuid not null references public.connector_bindings(id) on delete cascade,
  health_status public.health_status not null default 'unknown',
  latency_ms integer,
  message text,
  checked_at timestamptz not null default now()
);
create index idx_connector_health_checks_binding on public.connector_health_checks(connector_binding_id);
grant select on public.connector_health_checks to authenticated;
grant all on public.connector_health_checks to service_role;
alter table public.connector_health_checks enable row level security;
create policy "connector_health_checks_select_members" on public.connector_health_checks for select to authenticated
  using (
    exists (
      select 1 from public.connector_bindings b
      where b.id = connector_binding_id and public.is_org_member(b.organization_id, auth.uid())
    )
  );
