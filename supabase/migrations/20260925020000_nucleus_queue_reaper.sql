-- ============================================================
-- NUCLEUS QUEUE REAPER — closes the gap docs/adr/005-durable-postgres-queue.md
-- names: claim_next_queue_message() marks a row 'processing' and
-- increments attempts, but if the worker that claimed it dies (crash,
-- redeploy, OOM) before ever calling markQueueMessageDelivered() or
-- markQueueMessageFailed(), that row stays 'processing' forever. No
-- code path anywhere resets it -- it's not lost the way the pre-durable
-- in-memory queue lost messages outright, but it's stuck exactly the
-- same as if it were, since nothing ever polls it again.
-- ============================================================

-- reap_stuck_queue_messages(): finds every 'processing' row whose
-- updated_at is older than p_stuck_after (the worker had that long to
-- finish and didn't -- default 5 minutes is generous for this
-- ecosystem's actual per-message work, which is sub-second HTTP calls
-- and DB writes, not long-running jobs). FOR UPDATE SKIP LOCKED so this
-- can never race a worker that's genuinely mid-update on the same row
-- right now -- same idiom claim_next_queue_message() already uses.
--
-- A row that's exhausted max_attempts goes to 'failed' (terminal,
-- visible via the dead-letter view below); everything else goes back to
-- 'pending' so the next poller picks it up. attempts is NOT
-- incremented here -- it was already incremented by whichever
-- claim_next_queue_message() call got the worker that then died, so
-- incrementing again would double-count an attempt that produced no
-- real work.
create or replace function public.reap_stuck_queue_messages(p_stuck_after interval default interval '5 minutes')
returns table(id uuid, queue text, new_status text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with stuck as (
    select nqm.id
    from nucleus_queue_messages nqm
    where nqm.status = 'processing'
      and nqm.updated_at < now() - p_stuck_after
    for update skip locked
  )
  update nucleus_queue_messages nqm
  set status = case when nqm.attempts >= nqm.max_attempts then 'failed' else 'pending' end,
      last_error = coalesce(nqm.last_error, '{}'::jsonb) || jsonb_build_object(
        'reaper', 'stuck in processing beyond stuck_after threshold -- worker likely crashed or was redeployed mid-delivery',
        'reaped_at', now(),
        'stuck_after', p_stuck_after::text
      ),
      updated_at = now()
  from stuck
  where nqm.id = stuck.id
  returning nqm.id, nqm.queue, nqm.status;
end;
$$;

comment on function public.reap_stuck_queue_messages is
  'Requeues (or terminally fails, if max_attempts exhausted) nucleus_queue_messages rows stuck in processing past p_stuck_after. Scheduled every 2 minutes via pg_cron -- see the reap-stuck-nucleus-queue-messages job below.';

-- Dead-letter observability: docs/adr/005 also names "no dead-letter
-- table or view" as a gap -- failed messages existed (status =
-- 'failed') but had to be found by filtering the raw table by hand.
-- This is that view, not a new table -- it's a read-only lens over the
-- same rows.
create or replace view public.nucleus_queue_dead_letters as
select id, organization_id, queue, payload, attempts, max_attempts, last_error, created_at, updated_at
from nucleus_queue_messages
where status = 'failed'
order by updated_at desc;

comment on view public.nucleus_queue_dead_letters is
  'Read-only lens over nucleus_queue_messages rows in their terminal failed state -- either delivery genuinely failed max_attempts times, or reap_stuck_queue_messages() gave up on a row stuck in processing past its retry budget.';

-- Same idempotent unschedule-then-schedule pattern
-- 20260924230500_org_member_access_expiry.sql (dualpay schema, same
-- project) already established for cleanup-expired-org-members --
-- re-running this migration must not create a duplicate job.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reap-stuck-nucleus-queue-messages') then
    perform cron.unschedule('reap-stuck-nucleus-queue-messages');
  end if;
end $$;

select cron.schedule(
  'reap-stuck-nucleus-queue-messages',
  '*/2 * * * *',
  $$select public.reap_stuck_queue_messages();$$
);
