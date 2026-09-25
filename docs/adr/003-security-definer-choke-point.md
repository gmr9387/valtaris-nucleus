# ADR-003: SECURITY DEFINER helper functions as the single enforcement choke point

## Status
Accepted (implemented, live). Extended in
`supabase/migrations/20260924230500_org_member_access_expiry.sql`
(DualPay repo).

## Context
Nearly every RLS policy in the `dualpay` schema needs to answer the
same two questions: "is this caller a member of this organization?"
and "does this caller hold at least this role in this organization?"
Those questions could be answered by repeating the same subquery
inline in every policy's `USING`/`WITH CHECK` clause. That means the
membership/role rule is duplicated across dozens of policies, and a
correction to the rule — for example, "a membership that has expired no
longer counts" — requires finding and editing every single one
correctly.

## Decision
Two `SECURITY DEFINER` SQL functions, `dualpay.is_org_member(org_id,
user_id)` and `dualpay.has_org_role(org_id, user_id, min_role)`, are
the only place that logic is written. Every RLS policy that needs a
membership or role check calls one of these functions instead of
inlining the subquery. When time-limited (contractor) access needed to
be added, it was a single change: add `expires_at` to
`organization_members`, then add one `AND (expires_at IS NULL OR
expires_at > now())` clause inside these two functions. Every policy
that calls them inherited the new expiry check with zero per-policy
edits — see the commit message on that migration for the exact diff.

## Alternatives considered
- **Inline the membership/role subquery in every policy.** Rejected for
  the duplication problem above — demonstrated concretely by how small
  the expiry-check change was *because* this pattern was already in
  place; the same change against inlined subqueries would have touched
  every policy in the schema instead of two functions.
- **Enforce membership/role in application code before the query runs.**
  Rejected for the same reason as ADR-002 rejects application-layer
  tenant filtering: it's bypassable by any code path that doesn't go
  through the check, and RLS should hold even if application code has
  a bug.

## Consequences
- These two functions are now the single most load-bearing pieces of
  authorization logic in the `dualpay` schema — nearly every policy's
  correctness reduces to their correctness. A bug in either function is
  not contained to one table; it's a schema-wide authorization bug.
- Because they're `SECURITY DEFINER` and `STABLE`, Postgres can treat
  a call to them inside a policy as cacheable per-statement in the same
  way the `(select auth.uid())` wrapping from ADR-002 is — the choke
  point doesn't cost a per-row function call for every row evaluated.
- Adding a new cross-cutting membership rule (the expiry check, or
  anything like it in the future) is now a two-function change instead
  of an N-policy change, which is also why it was safe to do this
  mid-session without auditing every policy by hand afterward — the
  policies didn't change, only what the functions they call return.

## Failure modes / what breaks if this is wrong
- Any bug in `is_org_member`/`has_org_role` — an off-by-one in the
  expiry comparison, a role-hierarchy ordering mistake in
  `has_org_role`'s `min_role` comparison — is immediately a schema-wide
  authorization bug, not a single-table one. This is the direct tradeoff
  for the choke point's leverage: it concentrates risk exactly where it
  concentrates power.
- These functions were **not** verified against a live inserted-row
  test in this session — an attempted live test was abandoned because
  the cleanup step collided with `ops_events`' append-only trigger (see
  the RISK_REGISTER work). The expiry logic was instead verified via a
  pure `SELECT` of the boolean predicate with no table writes. That's
  weaker than an end-to-end test against real rows and real RLS
  evaluation, and is a real gap: a proper integration test for this
  function pair (real rows, real policy evaluation, real cleanup that
  doesn't fight the audit-trail triggers) doesn't exist yet.
