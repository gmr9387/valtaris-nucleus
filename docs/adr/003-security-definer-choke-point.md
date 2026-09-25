# ADR-003: SECURITY DEFINER helper functions as the single enforcement choke point

## Status

Accepted (implemented, live). Extended in
`supabase/migrations/20260924230500_org_member_access_expiry.sql`
(DualPay repo). The "not verified against a live inserted-row test"
gap this ADR originally named is now closed — see the update at the
end of Failure modes and `supabase/tests/is_org_member_and_has_org_role.sql`
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
user_id)` and `dualpay.has_org_role(org_id, user_id, roles text[])`
(an explicit allowed-roles array, not a hierarchy/min-role comparison
-- corrected from this ADR's original wording, which described a
signature that doesn't match the real function; every call site passes
an explicit array like `array['manager','admin','owner']`), are
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
  the expiry-check change was _because_ this pattern was already in
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
  expiry comparison, a typo in one call site's allowed-roles array
  (e.g. `array['amdin']`) — is immediately a schema-wide authorization
  bug, not a single-table one. This is the direct tradeoff for the
  choke point's leverage: it concentrates risk exactly where it
  concentrates power.
- **Update:** the gap below (no live inserted-row test) is now closed.
  `supabase/tests/is_org_member_and_has_org_role.sql` (DualPay repo)
  inserts a real org, a real active member, and a real expired member,
  then asserts both the function-level predicates AND real RLS policy
  enforcement on a real table (`adjudication_runs`) by switching to the
  `authenticated` role and setting `request.jwt.claim.sub` the same way
  PostgREST does from a real JWT -- not just calling the function in
  isolation. The whole thing runs inside one transaction that ends in
  `ROLLBACK`, so it never issues a `DELETE` and never touches the
  append-only `ops_events` triggers that blocked the earlier attempt.
  Verified live against the real project: all 9 assertions passed, and
  a follow-up query confirmed zero residual rows after rollback.
- **History, for context:** an earlier attempt at this same live test,
  in an earlier pass this session, was abandoned because its cleanup
  step tried `DELETE FROM organizations`, which cascaded into
  `ops_events` and hit that table's append-only
  `prevent_ops_events_update_delete`/`prevent_ops_events_delete`
  triggers (see the RISK_REGISTER work). That attempt fell back to
  verifying the expiry logic via a pure `SELECT` of the boolean
  predicate with no table writes — real logic, but not a real
  integration test. The fix wasn't a workaround for the trigger; it was
  restructuring the test to never issue a `DELETE` at all (see the
  Update above) — the trigger was never actually an obstacle once the
  test stopped trying to clean up by deleting.
