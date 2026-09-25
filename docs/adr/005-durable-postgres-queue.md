# ADR-005: Postgres-backed durable queue instead of an in-memory queue

## Status

Accepted (implemented, live).
`supabase/migrations/20260922000000_nucleus_queue.sql`. The
stuck-in-`processing` gap this ADR originally named as unsolved is now
closed — see the update at the end of Consequences and
`supabase/migrations/20260925020000_nucleus_queue_reaper.sql`.

## Context

`QueueEngine` (`src/nucleus/queue/queueEngine.ts`) is real, with real
callers (`TelemetryAdapter`, the Scheduler, the `Nucleus` class's own
`enqueue()`), but it originally held every queued message in a
process-local `Map<string, QueueMessage[]>`. That's fine for
correctness _within_ one continuously-running process — it's not fine
for a background runtime that has to survive a deploy, a crash, or a
routine restart, since a process-local map is gone the instant the
process is. Anything still queued or mid-retry at that moment is
silently dropped, with no error surfaced anywhere.

## Decision

Give the queue a real backing table, `nucleus_queue_messages`
(`organization_id`, `queue`, `payload jsonb`, `attempts`,
`max_attempts`, `status` constrained to
`pending|processing|delivered|failed`, `last_error`). Dequeuing is a
single `SECURITY DEFINER` function, `claim_next_queue_message(queue)`,
that does `SELECT ... FOR UPDATE SKIP LOCKED` — the same fix-once,
apply-everywhere pattern as ADR-003: two concurrent workers polling the
same queue can never claim the same row, without a separate lock table
or advisory-lock bookkeeping. RLS is enabled on the table but the only
policy is a service-role bypass, since this runtime is confirmed
server-side-only (never imported by any React page/component) and
accessed exclusively through the same service-role client pattern
(`queueDB.ts` mirrors `client.server.ts`'s existing `supabaseAdmin`).

## Alternatives considered

- **Leave it in-memory, add a periodic snapshot-to-disk/DB as a backup.**
  Rejected: still loses anything queued between the last snapshot and
  the crash, and adds complexity (snapshot scheduling, restore-on-boot
  logic) that a real backing table doesn't need at all.
- **An external queue service (SQS-equivalent, Redis-backed queue).**
  Not pursued: introduces a new operational dependency and a new
  credential/network surface for a workload this project's existing
  Postgres already handles correctly via `FOR UPDATE SKIP LOCKED` —
  adding infrastructure the ecosystem doesn't otherwise need to solve a
  problem the database it already has can solve.
- **Advisory locks instead of `FOR UPDATE SKIP LOCKED`.** Rejected:
  `SKIP LOCKED` is the narrower, purpose-built tool for exactly this
  "many workers, claim-one-row-atomically" pattern and needs no
  separate lock-id bookkeeping or explicit unlock discipline.

## Consequences

- A restart, deploy, or crash mid-processing now leaves messages in
  `status = 'processing'` rather than losing them outright, and a
  scheduled reaper now recovers those rows automatically — see the
  update below.
- `attempts`/`max_attempts` give the queue a retry ceiling; the reaper
  is now the thing that actually reads `attempts >= max_attempts` to
  route an unrecoverable message to `failed` when it's the one that
  notices the row is stuck. A message whose _handler_ fails (as
  opposed to whose worker crashes) still goes through
  `markQueueMessageFailed()` in `queueRepo.ts`, unchanged.
- Queue depth, per-queue backlog, and processing latency are now real
  SQL queries against a real table (`queue`, `status`, `created_at`)
  instead of unobservable in-process state — this is a precondition for
  the observability work described as a next step (queue-depth
  metrics), not that work itself.
- **Update:** the stuck-in-`processing` gap and the missing dead-letter
  view, both named below as open when this ADR was first written, are
  now closed. `supabase/migrations/20260925020000_nucleus_queue_reaper.sql`
  adds `reap_stuck_queue_messages(p_stuck_after interval default '5
minutes')` — same `FOR UPDATE SKIP LOCKED` idiom as
  `claim_next_queue_message()`, so it can never race a worker that's
  genuinely still updating a row right now — scheduled via `pg_cron`
  every 2 minutes (`reap-stuck-nucleus-queue-messages`, the same
  unschedule-then-reschedule idempotent pattern
  `cleanup-expired-org-members` established). A row under its
  `max_attempts` goes back to `pending` for the next poller; a row that's
  exhausted its budget goes to terminal `failed`, now readable
  through the `nucleus_queue_dead_letters` view instead of a hand-filtered
  query. Verified live against the real table, not just unit-tested: two
  synthetic rows were inserted with `updated_at` backdated 10 minutes,
  the reaper was invoked directly, and it produced exactly the expected
  `pending`/`failed` split before the test rows were deleted.

## Failure modes / what breaks if this is wrong

- The reaper's 5-minute default threshold is a guess based on this
  ecosystem's actual per-message work being sub-second HTTP calls and DB
  writes, not measured against real production latency distributions —
  if a legitimate handler ever needs longer than 5 minutes, the reaper
  will requeue a message that was actually still being processed,
  causing it to run twice. Nothing today makes delivery idempotent
  against that double-run; `pg_cron`'s job history
  (`cron.job_run_details`) is the only current way to notice if this is
  happening in practice.
- The reaper itself is a single `pg_cron` job on a 2-minute cadence —
  if `pg_cron` stops running (extension disabled, job accidentally
  unscheduled, the scheduler process itself wedged), stuck rows go back
  to being silently invisible exactly as before this fix, and nothing
  alerts on that regression.
- `FOR UPDATE SKIP LOCKED` correctness depends on every consumer going
  through `claim_next_queue_message` — a future code path that reads
  `nucleus_queue_messages` directly with a plain `SELECT ... WHERE
status = 'pending'` would reintroduce the double-claim race this
  function exists to prevent.
