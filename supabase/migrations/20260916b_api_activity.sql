-- ============================================================
-- API ACTIVITY — durable, queryable outcome feed for the three
-- external nucleus endpoints, powering the admin "Command Center"
-- dashboard.
-- ============================================================
-- Previously each endpoint's business-outcome events only went to
-- console.log (queryable one request at a time via Supabase's log
-- viewer, not by a UI). This table is the durable version of the
-- same events, written alongside (not instead of) those console.log
-- calls -- the log lines stay useful for real-time debugging, this
-- table is what a dashboard actually queries.
--
-- Request *volume* per client comes from api_rate_limits (its
-- request_count already tracks every call to every endpoint,
-- including the guardian-status polls this table deliberately
-- doesn't log individually -- see guardian-status/index.ts's own
-- comment on why). This table is a curated outcome feed, not a raw
-- request counter: guardian-status only writes here on an unsafe or
-- unverifiable result, same as its console.log convention, to avoid
-- one row per poll at up to 600/min/client.
--
-- No RLS policies -- service-role only, same convention as
-- api_clients and api_rate_limits. The admin UI reads this through
-- an Edge Function holding the service-role key, never directly.
-- ============================================================

create table if not exists api_activity (
  id bigint generated always as identity primary key,
  client_id text not null,
  endpoint text not null check (endpoint in ('adjudicate_claim', 'weaver_score', 'guardian_status')),
  outcome text not null,
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_api_activity_client_time on api_activity (client_id, occurred_at desc);
create index if not exists idx_api_activity_endpoint_time on api_activity (endpoint, occurred_at desc);

alter table api_activity enable row level security;
