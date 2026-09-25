# ADR-005: Postgres-backed durable queue instead of an in-memory queue

## Status
Accepted (implemented, live).
`supabase/migrations/20260922000000_nucleus_queue.sql`.

## Context
`QueueEngine` (`src/nucleus/queue/queueEngine.ts`) is real, with real
callers (`TelemetryAdapter`, the Scheduler, the `Nucleus` class's own
`enqueue()`), but it originally held every queued message in a
process-local `Map<string, QueueMessage[]>`. That's fine for
correctness *within* one continuously-running process — it's not fine
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
  `status = 'processing'` rather than losing them outright — but
  nothing in this migration or the runtime around it yet reaps a
  message stuck in `processing` because the worker that claimed it
  died before marking it `delivered` or `failed`. That's a real,
  named gap, not a solved problem — see Failure modes.
- `attempts`/`max_attempts` give the queue a retry ceiling, but nothing
  currently reads `attempts >= max_attempts` to route a message to a
  dead-letter state automatically; `status = 'failed'` has to be set by
  the caller.
- Queue depth, per-queue backlog, and processing latency are now real
  SQL queries against a real table (`queue`, `status`, `created_at`)
  instead of unobservable in-process state — this is a precondition for
  the observability work described as a next step (queue-depth
  metrics), not that work itself.

## Failure modes / what breaks if this is wrong
- **The stuck-in-`processing` gap above is the main one.** A worker
  that crashes after `claim_next_queue_message` returns a row but
  before it finishes processing leaves that row claimed forever unless
  something else notices and requeues it. This needs a reaper (a
  scheduled function that resets `processing` rows older than some
  threshold back to `pending`, incrementing `attempts`) — not built yet.
- No dead-letter table or view exists for messages that exhaust
  `max_attempts` — they'd need to be found via `status = 'failed'`
  filtering today, not surfaced automatically.
- `FOR UPDATE SKIP LOCKED` correctness depends on every consumer going
  through `claim_next_queue_message` — a future code path that reads
  `nucleus_queue_messages` directly with a plain `SELECT ... WHERE
  status = 'pending'` would reintroduce the double-claim race this
  function exists to prevent.
