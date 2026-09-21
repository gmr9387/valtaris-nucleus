-- Real idempotency for adjudicate-claim's new "resolved" mode (a
-- caller sends its own already-resolved contract/plan/accumulators and
-- gets the computed run+trace back, rather than nucleus looking them up
-- from its own, separate contract database). The kernel is pure --
-- same input always produces the same output -- so a duplicate
-- idempotency_key within the cache window can safely return the cached
-- result instead of recomputing (and, in the legacy mode, re-writing
-- accumulators a second time).
--
-- Deliberately NOT a general-purpose cache: entries are looked up by
-- the exact key the caller supplies (expected to be a real content
-- fingerprint, e.g. DualPay's own buildTraceFingerprint() output), not
-- generated here.
create table if not exists adjudication_replay_cache (
  idempotency_key text primary key,
  client_id text not null,
  run jsonb not null,
  trace jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_replay_cache_client on adjudication_replay_cache (client_id, created_at desc);

alter table adjudication_replay_cache enable row level security;

-- Written and read only by the adjudicate-claim Edge Function itself,
-- which holds the service-role key (verify_jwt is disabled for that
-- function -- callers authenticate via x-api-key, not a Supabase
-- session -- so there is no end-user JWT for a normal RLS policy to
-- check here). No authenticated-user or anon policy is intended.
create policy "replay_cache_service_role_only"
  on adjudication_replay_cache
  for all
  using (auth.role() = 'service_role');
