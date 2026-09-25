-- Found via Supabase's performance advisor (unindexed_foreign_keys):
-- public.credentials and public.connector_bindings each had 4 foreign-key
-- columns with no covering index -- forces a full table scan on every
-- UPDATE/DELETE of the referenced row, and these specifically gate
-- credential/connector lookups. Both tables are currently empty, so this
-- is free today.
create index if not exists idx_credentials_created_by on public.credentials (created_by);
create index if not exists idx_credentials_environment_id on public.credentials (environment_id);
create index if not exists idx_credentials_project_id on public.credentials (project_id);
create index if not exists idx_credentials_provider_id on public.credentials (provider_id);

create index if not exists idx_connector_bindings_created_by on public.connector_bindings (created_by);
create index if not exists idx_connector_bindings_credential_id on public.connector_bindings (credential_id);
create index if not exists idx_connector_bindings_environment_id on public.connector_bindings (environment_id);
create index if not exists idx_connector_bindings_project_id on public.connector_bindings (project_id);
