-- ============================================================
-- API CLIENTS — real service-to-service auth for external endpoints
-- ============================================================
-- Backs the new adjudicate-claim Edge Function (the first real
-- external-facing API nucleus exposes): callers authenticate with an
-- x-api-key header, checked against this table's SHA-256 hash -- no
-- plaintext key is ever stored, and no Supabase JWT is required since
-- callers are other services (DualPay Core Ledger, first), not
-- Supabase-authenticated end users of this project.
--
-- No RLS policies are defined -- this table is intentionally readable
-- only by the service-role key (which every Edge Function holds via
-- its auto-injected SUPABASE_SERVICE_ROLE_KEY), never by an
-- authenticated end user or the anon key.
-- ============================================================

create table if not exists api_clients (
  client_id text primary key,
  key_hash text not null,
  label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table api_clients enable row level security;
