# ADR-006: Weaver/Guardian/Glue/DualPay as enforced boundaries, not convention

## Status

Accepted (implemented, live). The specific gap this ADR originally
named — Law 6 asserted but not proven — is now closed for the
`guardian` → `glue`/`dualpay` boundary; see the update at the end of
Consequences and `src/nucleus/runtime/runtimeRouter.ts`'s
`enforceGuardianProvenance()`.

## Context

`valtaris_constitution` (repo root) states seven laws: Weaver may find
but never authorize or execute; Guardian may authorize but never
discover or execute; Glue may execute but never decide; DualPay
specializes in the healthcare domain but never authorizes cross-system.
A document stating this is not the same thing as a system that can't
violate it — the interesting engineering question is which of these
boundaries are actually load-bearing in code versus asserted in prose.

## Decision

The boundary is enforced, not just documented, at the points that
matter most for financial correctness: Glue's execution gate reads
Guardian's and Weaver's real output before running anything — it
doesn't recompute authorization or opportunity scoring itself, it
consumes their decisions. Guardian's authorization does real
fail-closed kill-switch checks and real per-payer contract/plan lookups
feeding real deductible/OOP math — confirmed by reading the runtime
code, not assumed from the README's own claims (this is the same
verify-before-trust discipline applied throughout this ecosystem's
documentation work). Weaver's opportunity scoring is a configurable
rules engine against a `weaver_rules` table, not a stub returning a
constant. DualPay's reactor is a pure function over that upstream
output — it doesn't call back into Guardian or Weaver to re-decide
anything after the fact.

Each subsystem also has telemetry emission wired at its real dispatch
point, though what that telemetry reaches today is narrower than "fully
persisted and queryable" — see the README's own Capability Status table
(§7) for the honest breakdown of what's implemented versus partial
versus stub.

## Alternatives considered

- **A single monolithic decision function that does discovery,
  authorization, and execution inline.** Rejected: this is exactly what
  Law 6 (Boundary Integrity) exists to prevent — collapsing the stages
  makes it impossible to audit _which_ stage produced a given outcome,
  and makes it easy for a future change to "helpfully" let execution
  logic peek at data it has no business seeing (e.g., Glue deciding to
  retry with different parameters based on its own re-assessment of
  risk, instead of asking Guardian again).
- **Enforce the boundary only by code review / convention.** Rejected
  for the same reason ADR-002 rejects application-layer-only tenant
  filtering: it's correct until someone forgets, and "someone forgets"
  in a financial authorization path is not a hypothetical risk worth
  accepting when the alternative (each subsystem only receiving the
  upstream stage's output, never the raw inputs needed to redo that
  stage's job) is achievable in the type signatures themselves.

## Consequences

- Each subsystem's runtime function signature is itself a boundary
  enforcement mechanism: Glue's execution entry point takes Guardian's
  decision object, not the raw claim — it structurally cannot
  re-derive authorization from scratch because it was never given what
  it would need to.
- This makes "what did Guardian actually decide, and did Glue honor
  it?" answerable by reading one function call's arguments, which is
  the property ADR that a future "lineage as a first-class primitive"
  effort (turning each execution into a provenance graph, not just a
  log line) would build directly on top of — that work doesn't exist
  yet, but this ADR is what makes it tractable when it does.
- **Update:** the gap described in the previous paragraph is now closed
  for `glue.execution` and `dualpay.payment`. `RuntimeRouter.dispatch()`
  records each claim's real `guardian.authorization` result under a
  claim-scoped key (`nucleusState`, keyed by `${organizationId}.guardian.authorization:${claimId}`,
  not just by org — two claims for the same org in flight at once must
  not be able to clobber each other's provenance record) the moment
  Guardian's dispatch succeeds, then rejects any `glue.execution` or
  `dualpay.payment` dispatch whose `payload.authorization` doesn't
  structurally match that recorded result — before the subsystem's own
  `handle()` ever runs, not just at the contract-validation step after.
  Proven by `src/nucleus/tests/runtimeRouterBoundary.test.ts`: a
  fabricated `{ decision: "allow" }` payload with no real Guardian
  dispatch behind it is rejected, a forged override of a claim that DID
  go through Guardian is rejected, and the real, unmodified pipeline
  output still passes. This was a real, exploitable gap when this ADR
  was first written — `executionContract.ts`'s own `validate()` only
  checked internal consistency ("executed" requires
  `authorization.decision === "allow"`), which a fabricated object
  satisfies trivially, so a hand-built payload really could have forced
  an execution no real Guardian call ever authorized.
- What's still open: this only covers the in-process call graph inside
  this repo. It doesn't (and structurally can't) protect against a
  compromised or buggy Edge Function deployment fabricating its own
  `nucleusState` in a separate process, and the `nucleusState` records
  themselves are in-memory, not persisted — a process restart mid-claim
  loses the provenance record along with everything else `ADR-005`
  already flags as at-risk on restart. Extending this same provenance
  model to Weaver's `opportunity`/`recommendation` inputs (nothing today
  stops a fabricated `opportunity` object from reaching Guardian's own
  authorization decision) is the next natural extension, not yet done.

## Failure modes / what breaks if this is wrong

- A future subsystem, or a future change to an existing one, that adds
  a convenience code path bypassing the boundary (e.g., Glue catching
  a Guardian timeout and "safely" proceeding anyway) reintroduces
  exactly the coupling this ADR exists to prevent, and nothing today
  would catch that at review time except a human noticing.
- The honesty of the README's Capability Status table (§7) is doing a
  lot of work here — the value of "Guardian does real checks, not a
  mock" depends entirely on that claim staying true and staying
  verified against actual code, not just asserted. This ecosystem's own
  history includes README claims that drifted from reality (see the
  stale project-URL bugs fixed in DualPay's nucleus-proxy READMEs) —
  the same drift risk applies here and isn't uniquely immune to it.
