# ADR-002: Postgres RLS is the tenant-isolation enforcement point, not application code

## Status

Accepted (implemented, live). Performance-hardened in
`supabase/migrations/20260924224814_dualpay_rls_perf_and_demo_policy_fix.sql`
(DualPay repo).

## Context

Every table in the `dualpay` schema is scoped to an `organization_id`.
The naive way to enforce that is: every query in application code
(`src/lib/*.ts`) filters by the caller's current org. That approach has
one property that makes it unacceptable for this system: it's only as
strong as the discipline of every future call site, forever. Miss one
`.eq('organization_id', ...)` clause in one new function and a tenant
can read or write another tenant's claims, contracts, or financial
data. There is no compiler or test that catches that omission by
construction.

## Decision

Enforce tenant isolation as Postgres Row-Level Security policies on
every `dualpay`-schema table, driven by the caller's JWT
(`auth.uid()`), not by application-level filtering. Application code
can genuinely forget the org filter and the query still can't cross a
tenant boundary — the database refuses the row, not the client code.

While auditing these policies for a performance problem (unwrapped
`auth.uid()` calls re-evaluated per row instead of once per query — see
the same migration), a real RLS bypass was found and fixed in the same
pass: `claim_assignments_update_demo`, a leftover demo policy that
granted broader UPDATE access than the org-scoped policy beside it.
That policy is now dropped. This is the argument for RLS in practice,
not just in theory: the audit that was supposed to be about query
performance surfaced a live authorization bug, because policies are
concentrated in one place a `pg_policies` catalog query can enumerate
and reason about — an equivalent audit of scattered `.eq()` calls
across every `src/lib/*.ts` file would be far easier to get wrong.

## Alternatives considered

- **Application-layer filtering only.** Rejected for the reason above:
  correctness depends on every future engineer never forgetting a
  clause, in a codebase where "forgetting a clause" produces a
  cross-tenant PHI leak, not a visible bug.
- **A middleware/ORM layer that injects the org filter automatically.**
  Not pursued: still application code, still bypassable by any query
  that goes around the middleware (a raw RPC, a service-role script, a
  new Edge Function that doesn't know about the convention), and adds
  an abstraction layer whose correctness itself now needs auditing.
- **RLS only on the most sensitive tables, filtering elsewhere.**
  Rejected: a partial policy makes "is this table protected?" a fact
  someone has to remember per-table instead of a fact enforced
  uniformly; the `claim_assignments_update_demo` bug is exactly the
  kind of gap that a "mostly RLS" posture leaves room for.

## Consequences

- Every new `dualpay`-schema table needs an explicit RLS policy before
  it's safe to query at all — `ALTER TABLE ... ENABLE ROW LEVEL
SECURITY` with no policy denies all access by default, which is the
  correct fail-closed default but means a forgotten policy shows up as
  "nothing works" rather than silently leaking data. That's the right
  failure direction.
- Service-role (backend/Edge Function) code intentionally bypasses RLS
  — it has to, to do cross-tenant admin operations. That makes the
  service-role key itself the actual trust boundary for backend code,
  not RLS; see ADR-003 for how membership/role checks are still
  enforced for that code path.
- Policy correctness is now auditable as data: `pg_policies` can be
  queried and reasoned about as a single catalog, which is what made
  the `claim_assignments_update_demo` bug findable in the first place.

## Failure modes / what breaks if this is wrong

- A policy with an incorrect `USING`/`WITH CHECK` clause is a silent
  cross-tenant leak or a silent cross-tenant write, exactly like the
  bug this ADR describes finding — the fix for that specific instance
  is shipped, but the class of bug (a wrong-but-present policy, not a
  missing one) is not eliminated by having RLS at all, only made
  auditable.
- RLS policies evaluated per-row instead of via a cached InitPlan (the
  unwrapped `auth.uid()` problem this same migration also fixed) scale
  badly under load — this was a real, measured performance defect, not
  a hypothetical one, before the `(select auth.uid())` rewrite.
