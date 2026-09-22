-- ============================================================
-- NUCLEUS QUEUE — durable, restart-surviving replacement for
-- QueueEngine's in-memory Map<string, QueueMessage[]>
-- ============================================================
-- QueueEngine (src/nucleus/queue/queueEngine.ts) is real and has
-- real callers (TelemetryAdapter, Scheduler, the Nucleus class's
-- enqueue()), but every message lived only in a process-local Map --
-- a restart, deploy, or crash silently dropped anything still queued
-- or mid-retry. This table gives it a real backing store.
--
-- claim_next_queue_message() does the atomic dequeue: FOR UPDATE
-- SKIP LOCKED so two concurrent workers polling the same queue never
-- grab the same row, without needing a separate lock table.
-- ============================================================

create table if not exists nucleus_queue_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  queue text not null,
  payload jsonb not null,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed')),
  last_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_queue_messages_queue_status
  on nucleus_queue_messages (queue, status, created_at);

alter table nucleus_queue_messages enable row level security;

-- This runtime (src/nucleus/queue/*) is server-side-only background
-- worker code (confirmed: never imported by any React page/component),
-- accessed through the service-role client (src/nucleus/queue/queueDB.ts,
-- mirroring src/integrations/supabase/client.server.ts's existing
-- supabaseAdmin pattern) -- so it needs no end-user policy, only the
-- service-role bypass every other internal accounting table here uses.
create policy "service-role-full-queue-messages"
  on nucleus_queue_messages for all using (auth.role() = 'service_role');

-- Atomically claims and marks-processing the oldest pending message
-- for a queue. SKIP LOCKED means a second concurrent caller polling
-- the same queue gets the next row instead of blocking or double-
-- claiming this one.
create or replace function public.claim_next_queue_message(p_queue text)
returns nucleus_queue_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row nucleus_queue_messages;
begin
  select * into v_row
  from nucleus_queue_messages
  where queue = p_queue and status = 'pending'
  order by created_at asc
  for update skip locked
  limit 1;

  if v_row.id is null then
    return null;
  end if;

  update nucleus_queue_messages
  set status = 'processing', attempts = attempts + 1, updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;
