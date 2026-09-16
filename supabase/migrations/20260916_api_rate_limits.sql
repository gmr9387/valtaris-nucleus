-- ============================================================
-- API RATE LIMITS — real, atomic, per-client_id
-- ============================================================
-- Nucleus's external APIs (adjudicate-claim, weaver-score) had no
-- abuse control at all: a single api_clients credential could hammer
-- either endpoint indefinitely. Keyed by client_id rather than IP
-- since callers are named services (DualPay, valtaris-glue, ...), not
-- individual end users -- this also happens to be the natural unit a
-- future per-tenant quota would key on, without committing to that
-- larger redesign now.
--
-- Fixed-window counting: one row per (client_id, window_start). The
-- check-and-increment is a single INSERT ... ON CONFLICT ... RETURNING,
-- which Postgres executes atomically -- no read-then-write race
-- between concurrent requests from the same client.
--
-- Same access posture as api_clients: no RLS policies. This table is
-- an internal accounting mechanism for the external APIs' own
-- service-role client, never meant to be queried by an authenticated
-- end user or the anon key.
-- ============================================================

create table if not exists api_rate_limits (
  client_id text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (client_id, window_start)
);

create index if not exists idx_api_rate_limits_window on api_rate_limits (window_start);

alter table api_rate_limits enable row level security;

-- Fixed-window rate check: increments the counter for the caller's
-- current window and reports whether they're still under the limit.
-- Also opportunistically deletes windows old enough to never be
-- queried again, so the table doesn't grow unbounded without needing
-- a separate cron job.
create or replace function public.check_rate_limit(
  p_client_id text,
  p_window_seconds integer,
  p_max_requests integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  delete from api_rate_limits
  where window_start < now() - make_interval(secs => p_window_seconds * 2);

  insert into api_rate_limits (client_id, window_start, request_count)
  values (p_client_id, v_window_start, 1)
  on conflict (client_id, window_start)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;
