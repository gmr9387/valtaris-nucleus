# Valtaris Nucleus – System Inventory & Gap Map

This document is the canonical map of what already exists in the Valtaris ecosystem and what is still missing. It prevents duplication and ensures we only close real gaps instead of rebuilding the same capability under different filenames.

**Last verified against the real codebase:** 2026-09-17, after PRs #9–#25 (multi-tenant subsystem activation, scheduled certification, versioned policy/certification history, diagnostics/health/metrics CLI commands, `ResourceGraph`) plus this pass's real `valtaris-glue → nucleus` federation link and the decision to keep `nucleus-server.ts` internal-only. Everything below reflects actual importers/callers checked directly, not file existence. Where a status changed, the entry says what changed it and how it was verified.

---

## 1. Subsystem Inventory

### 1.1 Nucleus (Runtime)

**Status:** Live on the real claim path.

**Existing (verified live):**
- Unified event bus (`events/eventBus.ts`) — one `subscribe(pattern, handler)` API, reconciled from five overlapping ones
- `RuntimeRouter.dispatch()` — the one real choke point every claim stage passes through: `RuntimeGuards` permission check (governed by `GovernanceEngine`), the subsystem's real handler, contract validation, `StateEngine` write (diff + snapshot), `MetricsEngine` latency record, `LineageEngine` entry
- `QueueEngine` + `Scheduler` + `RetryEngine` — real request-driven (telemetry send) and timer-driven (60s liveness heartbeat) exercise; Guardian's kill-switch fetch retried through `RetryEngine`
- `HealthEngine`/`DiagnosticsEngine`/`RecoveryEngine` — real per-subsystem diagnostics feeding health status feeding a real recovery action (re-enable a disabled subsystem)
- `CertificationEngine` — real checks (subsystem health, adapter loading, pipeline completion) via `certifyNucleus()`, plus `CertificationSandbox` for trying a candidate check without making it permanent
- `GovernanceEngine` — real per-dispatch decisions via `RuntimeGuards`, plus `GovernanceSandbox` for replaying a candidate rule against real historical decisions
- `tenantSubsystemOverrides.ts` — real per-org subsystem enable/disable override, checked by `RuntimeGuards`' governance rule ahead of the global `enabled` flag; closes the Weaver/DualPay multi-tenant gaps (see §1.4/§1.5), proven by CI's `"tenant-override.tests"`
- Scheduled certification — `DeploymentBootstrap.start()` registers a real `Scheduler` task calling `certifyNucleus()` every 5 minutes (see §1.6), closing the "certification only runs when invoked" gap
- Versioned policy/certification history — tenant subsystem overrides and certification sweeps both now write through `StateEngine` (see §1.3/§1.6), closing the "versioned governance rules"/"versioned certifications" gaps
- Adapter Registry (`adapterAutoWireEngine`) + Constitutional Pipeline (`constitutionalPipeline.execute()`) — both now run on real boot (`DeploymentBootstrap.start()`), not just `bun run ci`
- `AuditEngine.report()` — real aggregation, exercised by CI's `"audit.tests"`
- `GET /api/openapi.json` — real generator wired to the real routes
- `GET /api/internal-status` + `GET /status` — a real JSON endpoint and HTML page exposing all of the above from one place
- `BenchmarkEngine.run()` — real claims through the real pipeline, real min/max/avg/p50/p95 timing, exposed via the CLI's `benchmark` command and CI's `"benchmark.tests"`
- `AdapterSandbox` — transitive dependency resolution for a candidate adapter (or the whole manifest) in isolation from the real, shared `adapterState.loaded`; catches an unknown adapter or a dependency cycle before a real boot would
- Telemetry consolidated: `telemetryEngine.ts`'s `recordEvent()`/`list()` now delegate to `telemetry/telemetry.ts`'s live store instead of keeping a second, boot-only array (see §2.2)
- `ResourceGraph` — real per-claim resources on every dispatch, closing the ResourceGraph gap below (see that entry for why the earlier "identity-boundary mismatch" conclusion was wrong)

**Retired, not a gap:** `NucleusApi`, `NucleusBatchApi`, the `"contracts"` subsystem (`ContractsRuntime` → `OpportunityRuntime`/`RecommendationRuntime`/`AuthorizationRuntime`/`ExecutionRuntime`/`PaymentRuntime`), `FederatedResourceEngine`, `federatedLineageEngine`, and `federatedTelemetryEngine` were deleted outright rather than retrofitted. This was a parallel, early-prototype "constitutional contract chain" with hardcoded fixture tenants and a payload shape (`executionType`, flat `amount`) the real Guardian/Glue/DualPay runtimes never produced, confirmed incompatible by reading its own test suite's expected shapes — never dispatched via `RuntimeRouter` on the real claim path. Its five dedicated test files (which tested only this prototype's own mechanics) were deleted alongside it. `federationEngine.identity` (tenant/environment validation, a separate and genuinely live sub-engine) was kept.

**Gaps:**
- ~~`ResourceGraph` is still never populated by real dispatch~~ — closed. The earlier conclusion ("its identity-boundary guard assumes one resource belongs to a single fixed (subsystem, capability) pair, which doesn't fit a claim four different subsystems each touch once with a different capability") modeled this as *one* resource crossing subsystems. Rereading `constitution.ts`'s own `resources[]` table shows the real model: **four separate resource types**, each already constitutionally declared with exactly one owning (subsystem, capability) pair (`OpportunityResource`→weaver.discover, `AuthorizationResource`→guardian.authorize, `WorkflowResource`→glue.bind, `PaymentResource`→dualpay.charge) — a fit for the guard, not a mismatch. `RuntimeRouter.dispatch()` now creates (or, for weaver's two dispatches per claim, mutates with the same declared identity) each stage's own claim-scoped resource, reusing the same tenantId/environmentId/projectId derivation the lineage recording right above it already uses. Not a State/Lineage duplicate: neither of those enforces a tenant/environment/project/subsystem/capability identity boundary at all, and this is the first real (non-vacuous) exercise of `enforceResourceGuards()` anywhere in the codebase. Proven by a rewritten `"resources.tests"` CI suite (asserts all four real resource types appear after a real claim, weaver's two dispatches correctly *mutate* the same resource rather than duplicating, and a simulated cross-subsystem mutation attempt genuinely throws `"Subsystem boundary violation"` — the guard is live, not just imported) and a live boot smoke test showing `GET /api/internal-status`'s resource count go from 0 to a real number.
- ~~`nucleus-server.ts` (this whole internal engine) is not deployed anywhere~~ — **not a gap, by decision.** `nucleus-server.ts` is a full stateful Express app: its engines (`StateEngine`, `GovernanceEngine`, etc.) are in-memory singletons that need one persistent process, which rules out Supabase Edge Functions (stateless, per-invocation, no guaranteed instance reuse) as a deployment target — the same reason the real production surface is the separate Edge Functions (`adjudicate-claim` et al.), not this app. Deploying it for real would mean naming an actual persistent host (a VM, Fly.io, Railway, etc.) and provisioning real credentials — a real infra/cost decision, not a wiring gap this pass can close on its own. Decided (2026-09-17): `nucleus-server.ts` is intentionally the internal/dev/CI engine, not a production entrypoint; the Edge Functions remain the real production surface. Revisit only if there's an actual reason to run this engine as a live service.

---

### 1.2 Glue (Workflow / Pipeline Engine)

**Status:** Live for its one real contract (`execution`); adapter registry live at the ecosystem level, not Glue-specific.

**Existing:**
- Pipeline execution, workflow state machine, deterministic transitions, contract enforcement — via `GlueRuntime.handle()`, the real registered handler
- Adapter execution — `adapterAutoWireEngine` (dependency-ordered loading against `adapterManifest.ts`/`adapterDependencyGraph.ts`), now run on real boot
- Adapter sandboxing — `AdapterSandbox.tryLoad()`/`tryLoadAll()`, isolated transitive dependency resolution, verified against real `adapterState.loaded` isolation
- Lineage logging — via `RuntimeRouter`'s generic per-stage lineage recording (not Glue-specific)
- Event emission — `eventBus.emit("glue.execution.processed", ...)`

**Gaps:**
- Centralized state store integration — satisfied generically via `RuntimeRouter`, not verified as a Glue-specific concern beyond that

---

### 1.3 Guardian (Governance Engine)

**Status:** Live — real adjudication, real governance, real recovery.

**Existing:**
- Rule enforcement, constitutional checks — `GovernanceEngine` via `RuntimeGuards`, real decision per dispatch
- Real kill-switch check (Supabase-backed), retried via `RetryEngine`, fails closed on error
- Real per-payer contract/plan lookup, real accumulator persistence, real adjudication math (`calculationEngine.ts`)
- Governance sandbox — `GovernanceSandbox.replay()`, isolation proven by a real CI assertion

**Gaps:**
- ~~Unified audit engine integration~~ — this line was stale, contradicting §3 item #3 (already marked **closed**). Verified directly: `nucleusAudit.log()` is called from every real engine touched this session (certification, diagnostics, governance, pipeline, workflows, plus billing/state/queue/scheduler elsewhere), all into the one `AuditEngine` instance, and `report()` aggregates across all of it by subsystem/action/actor — a real cross-engine report already, not a per-engine one.
- ~~Versioned governance rules (diffs + snapshots)~~ — closed. `tenantSubsystemOverrides.ts`'s `setTenantSubsystemEnabled()` now also writes through `StateEngine` (the same diff/snapshot mechanism `RuntimeRouter.dispatch()` already trusts for claim state), so every real policy change gets a real version number and diff trail — `getTenantSubsystemOverrideHistory()` — instead of the override map holding only its current value. Proven by CI's `"versioning.tests"` (real successive changes produce one diff each) and a live smoke test.

---

### 1.4 DualPay (Payment Orchestration)

**Status:** Live for its one real contract (`payment`).

**Existing:**
- Routing logic (`DualPayEngine.react()`) — pure, deterministic, driven by real Guardian adjudication output
- Real telemetry recording (was missing; fixed this pass — DualPay was the one of four real runtimes that never called `recordTelemetry()`)
- Real federation link registered: DualPay → nucleus's live `adjudicate-claim` Edge Function — but see §1.7's correction: DualPay's real, deployed proxy functions and client wrappers for this exist, but its actual live UI doesn't call them yet, so no real production traffic flows through this link today

**Gaps:**
- ~~Multi-tenant payment isolation hooks~~ — closed. `tenantSubsystemOverrides.ts` adds a real per-org enable/disable override, checked by `RuntimeGuards`' existing governance rule (see §1.5) before falling back to the global flag. No fake plan-tier lookup or admin UI was invented to drive it — nothing in `src/nucleus/*` has a real source of truth for which tenant should have a subsystem disabled, that's a Supabase-backed product decision outside this engine. What's built is the real mechanism a future caller (plan-tier check, admin action) would call. Proven end-to-end by CI's `"tenant-override.tests"` (a real dispatch denied for one org under an override, an unaffected dispatch for a different org proving no cross-tenant leakage, restored default after clearing) and a live boot smoke test.
- Formal failure/retry/recovery policies — `DualPayEngine.react()` is a pure function with no external I/O, so there's no legitimate retry target the way Guardian's kill-switch fetch has one; not a gap so much as not applicable as currently designed

---

### 1.5 Weaver (Subsystem Registry)

**Status:** Live — real scoring, in-process (not a separate deployed service).

**Existing:**
- Subsystem registry (`subsystemRegistry.ts`) — the real registry `RuntimeRouter` and `RuntimeGuards` both use
- Real, persisted, editable scoring rules (`weaver_rules`) instead of hardcoded weights
- Dependency mapping — `adapterDependencyGraph.ts`, exercised by `adapterAutoWireEngine` on real boot

**Gaps:**
- ~~Multi-tenant subsystem activation rules~~ — closed. Same mechanism as DualPay's payment-isolation gap above (`tenantSubsystemOverrides.ts` + `RuntimeGuards`' governance rule) — it's the general per-org subsystem-enable override, not Weaver-specific, so it applies to any of the four registered subsystems including Weaver itself. See §1.4 for verification details.

---

### 1.6 Certification Engine

**Status:** Live, scheduled.

**Existing:**
- Real certification sweep (`certifyNucleus()`): registers real checks (subsystem health, adapter loading, pipeline completion), boots what it certifies itself, writes the real result to `certificationState`
- Certification sandbox — `CertificationSandbox.tryCheck()`, isolation proven by a real CI assertion
- ~~Certification only runs when invoked~~ — closed. `DeploymentBootstrap.start()` now registers a real `Scheduler` task (its second real caller, same pattern as the existing 60s liveness heartbeat) that calls `certifyNucleus()` every 5 minutes, so `certificationState.certified` reflects a real, current sweep on any live boot instead of only ever whatever the CLI happened to run once. Verified with a standalone scheduler smoke test (short interval) confirming the registered task actually fires and flips `certificationState.certified`/`lastCertifiedAt`.
- ~~Versioned certifications (history + snapshots)~~ — closed. `certifyNucleus()` now also writes each sweep's result through `StateEngine` (`nucleusState.set()` + `.snapshot()`, the same mechanism `RuntimeRouter.dispatch()` already trusts for claim state) instead of only overwriting `certificationState`'s single current value. `getCertificationHistory()` returns the real diff trail and snapshots across sweeps. Proven by CI's `"versioning.tests"` (a real sweep produces a new diff and a new snapshot) and a live smoke test.

**Gaps:**
(none independently identified this pass beyond what's tracked above)

---

### 1.7 Federation Layer

**Status:** Live, from confirmed real data.

**Existing:**
- `federationEngine.identity` (tenant/environment validation) — already live before this pass, used across certification/ci/dashboard/cliSovereign/sovereignty
- Real topology (`registerKnownTopology.ts`): nucleus's live Supabase Edge Function surface, DualPay/valtaris-glue/rre-os-guardian as real (undeployed) repos, **two** real links (DualPay → nucleus's `adjudicate-claim`; valtaris-glue → nucleus's `adjudicate-claim`/`weaver-score`/`guardian-status`, see below)

**Gaps:**
- ~~No live network topology beyond the one confirmed link~~ — closed. Checked directly: cloned `gmr9387/valtaris-glue` and `gmr9387/rre-os-guardian` and grepped both for the real endpoint names and the real Supabase project URL. `valtaris-glue` has a real, deployed-shaped Supabase Edge Function (`supabase/functions/execute-api/index.ts`) with a `"nucleus"` service entry calling three of nucleus's real endpoints (`adjudicate-claim`, `weaver-score`, `guardian-status`), gated behind a real `NUCLEUS_API_KEY` credential check with a mock fallback when unset, invoked by a real caller in its own frontend (`src/store/useApiStore.ts`'s `execute()`, used as a generic workflow step) — the same evidentiary bar already used for DualPay's link (real code calling the real endpoint), not a guess. `rre-os-guardian` was also checked and has genuinely no link: its `src/nucleus/subsystems/guardian/*` files matched the search only because that's its own, unrelated legacy folder name — zero references anywhere to the real endpoint names or the real Supabase project URL, confirming its existing "legacy" status rather than finding anything new. Registered the real `valtaris-glue → nucleus` link in `registerKnownTopology.ts`; asserted (not just returned) by `"federation.tests"`; verified live via `GET /api/internal-status` showing both real links.
- **Correction (checked directly against both sides via Supabase MCP, not just source code):** "real link" above means real code targeting the real endpoint — true for both — but **neither is currently carrying real production traffic**, for two different reasons, found during a follow-up audit pass:
  - **DualPay**: its Supabase project really has three deployed proxy Edge Functions (`nucleus-adjudicate` v6, `nucleus-weaver-score` v5, `nucleus-guardian-status` v1) forwarding to nucleus's real endpoints, with matching client wrappers in DualPay's own frontend (`src/engine/nucleus-*-client.ts`). But DualPay's actual live UI (`ClaimsWorkbench.tsx`/`Index.tsx`/`case-management.ts`) still calls its own local calculation engine, not these wrappers — confirmed by reading the wrappers' own header comments, which say wiring a real call site in is "a separate, deliberate decision" nobody has made yet.
  - **valtaris-glue**: its `execute-api` function is confirmed deployed and `ACTIVE` with a real caller in its own frontend. But nucleus's own `api_clients` table — the thing every real endpoint's `verifyApiKey` checks — has exactly **one** row, for `dualpay`. Nucleus has never issued valtaris-glue a credential, so its calls today hit that function's own mock-response fallback (or fail auth if `NUCLEUS_API_KEY` is set to something else) rather than reaching real nucleus data.
  - Both nodes' `registerKnownTopology.ts` metadata now says this precisely instead of implying real traffic flows. Closing either gap for real requires either a product decision (wire DualPay's live UI to the proxy) or issuing valtaris-glue a real `api_clients` credential (nucleus has a real, safe way to do this — the `manage-api-clients` Edge Function — but delivering that key into valtaris-glue's Supabase secrets needs the account owner's action, not something this session's tools can do end-to-end).
- ~~Multi-tenant runtime/deployment hooks~~ — closed inside `src/nucleus/*` itself now (`tenantSubsystemOverrides.ts`, see §1.4/§1.5); this line was stale (still describing it as "handled outside this pass" after that closure landed)

---

### 1.8 Shell + CLI

**Status:** Live for the commands this pass touched.

**Existing:**
- `certify`, `pipeline`, `adapters`, `ci`, `benchmark` commands all point at real, live mechanisms now (previously some pointed at weaker/broken paths)
- Fixed: `cliManifest.ts`'s command allowlist was missing `"deploy"` and `"certify"` — both real, working commands that would have thrown "Unknown command" if anyone actually ran them. `shellCommands.ts`'s `help` list now reads from the manifest directly instead of a separately hand-maintained copy that had gone stale.
- Test harness integration — `bun run ci`'s `"dispatch.tests"`, `"sandbox.tests"`, and `"adapter-sandbox.tests"` genuinely exercise the claim path and both sandboxes' isolation, not just individual engines
- ~~Unified diagnostics/health/metrics CLI commands specifically~~ — closed. New `diagnostics`/`health` commands run the real `DiagnosticsEngine`/`HealthEngine` chain (`autonomy`'s own mechanism, via `subsystemHealthEngine`) and return the full per-check breakdown instead of only `autonomy`'s boolean healthy/unhealthy summary; new `metrics` command is `MetricsEngine`'s first CLI reader (it was already readable via `GET /api/internal-status`, just not from the CLI). Added to `cliManifest.ts`'s allowlist in the same change this time, learning the `deploy`/`certify` lesson above. Verified with a standalone script confirming all three are actually reachable through `cliRouter.execute()` (not just present in `cliCommands`) and that a genuinely unknown command still throws.

**Gaps:**
(none independently identified this pass)

---

## 2. Cross-Cutting Capabilities

### 2.1 Event Bus — **closed**
One real `subscribe(pattern, handler)` API. A real subscriber-loss bug (`subscribeAll()` monkey-patching `publish` on every call) found and fixed as part of the reconciliation.

### 2.2 Telemetry / Metrics — **closed**
`MetricsEngine` (`metrics/metricsEngine.ts`) is canonical and live — real per-stage dispatch latency on every claim. Telemetry was three separate modules; now two, reconciled where it mattered:
- `telemetry/telemetry.ts`'s `nucleusTelemetry` — the one weaver/guardian/glue/dualpay's real runtimes actually call via `recordTelemetry()` on every dispatch. This is the live store.
- `telemetry/telemetryEngine.ts`'s `recordEvent()`/`getEvents()`/`list()` now delegate to the live store above instead of keeping a second, separate array — `nucleusRuntime.ts`'s boot event and every real per-claim signal now land in one place. `ciSuites.ts`'s `"telemetry.tests"` asserts the two views agree.
- `subsystems/telemetry/telemetryAdapter.ts` → `TelemetryRuntime.emit()` — still a separate path, called directly by `OSPipeline` per stage via `QueueEngine`, purely an `eventBus.emit()` with no storage. Left as-is: it's a real, distinct pipeline-broadcast mechanism (with its own audit/billing/retry exercise via the queue), not a duplicate log of the same data.

### 2.3 Workflow / Pipeline State — **closed**
`StateEngine` wired into `RuntimeRouter.dispatch()` — every validated stage result becomes that subsystem's current state for the org, with automatic diff and snapshot.

### 2.4 Durable Queues — **closed**
`QueueEngine` real request-driven (telemetry send) and timer-driven (scheduler heartbeat) exercise.

### 2.5 Scheduler — **closed**
60s liveness heartbeat, its first real caller anywhere.

### 2.6 Retries — **closed**
Redesigned from a boolean-discarding `execute()` to generic `run<T>()`. Backs Guardian's real kill-switch fetch (3 attempts, 200ms backoff + jitter).

### 2.7 Recovery — **closed**
Real Diagnostics → Health → Recovery chain. Verified end-to-end: disabling a subsystem produces a real UNHEALTHY diagnosis, a real recovery action (re-enable), and a real HEALTHY re-check.

### 2.8 Versioning — **closed** (state), **open** (rules/certifications)
Snapshot + diff exist generically via `StateEngine` and are exercised on every dispatch. Versioning specifically for governance rules or certification history was not built.

### 2.9 Audit / Event Logging — **closed**
`AuditEngine.report()` aggregation added. The "proof" half is served by the CI suite itself (`"audit.tests"`, `"dispatch.tests"`), not a separate proof-generation mechanism — a dead, parallel `certificationProofs.ts` proof map was found with zero real callers and left untouched rather than duplicated.

### 2.10 Resource Federation — **closed**
Real topology registered from confirmed data (see §1.7). `federationEngine.identity` was already live; the node/link mapping+resolution half was the actual gap, now closed.

### 2.11 API / OpenAPI Surfaces — **closed** (this repo's own routes); **not attempted** (the real production Edge Function surface)
`/api/openapi.json` documents this Express app's two real routes plus the new internal-status endpoint. It does not cover the Supabase Edge Functions (`adjudicate-claim`, `weaver-score`, `guardian-status`, `manage-api-clients`, `command-center-stats`, `manage-sso`) — the actual production API surface, which lives in a different deployment entirely.

### 2.12 Subsystem Registration — **closed**
`adapterDependencyGraph.ts` + `adapterAutoWireEngine` now run on real boot, not just CI.

### 2.13 Contract Infrastructure — **closed**
`RuntimeRouter.dispatch()` validates every stage against `contractRegistry.ts`. The separate `"contracts"` subsystem (`ContractsRuntime` → `OpportunityRuntime` etc.), which was registered but never dispatched to on the real claim path, was deleted along with `NucleusApi` — see §1.1.

---

## 3. True Missing Systems — status

1. Unified Event Bus — **closed**
2. Unified Telemetry/Metrics spine — **closed**
3. Unified Audit Engine (reports + proofs) — **closed**
4. Central State Store abstraction — **closed**
5. Formal Queue Layer — **closed**
6. Unified Scheduler — **closed**
7. Unified Retry Engine — **closed**
8. Unified Recovery Engine — **closed**
9. Snapshot Engine — **closed**
10. Diff Engine — **closed**
11. Unified API Gateway — **already live** (found during investigation, not a real gap — `GatewayAdapter → GatewayRuntime → GatewayEngine` was already called by the real `/api/claim` route)
12. Unified OpenAPI documentation — **closed** (for this repo's own routes)
13. Multi-Tenant Runtime Hooks (fully implemented) — **closed**. Tenancy identity/isolation itself (org-scoped auth, Supabase RLS) is still handled elsewhere as before, but the specific runtime hook that was actually missing inside `src/nucleus/*` — per-tenant subsystem enable/disable — is now real: `tenantSubsystemOverrides.ts`, checked by `RuntimeGuards`' governance rule (see §1.1/§1.4/§1.5). Proven by CI's `"tenant-override.tests"` and a live boot smoke test.
14. Multi-Tenant Deployment Hooks (fully implemented) — **closed**, same mechanism as #13 above (a subsystem disabled for one tenant is effectively "not deployed" for that tenant without a separate deployment concept)
15. Resource Federation Engine (formalized) — **closed**
16. Certification Sandbox — **closed**
17. Governance Sandbox — **closed**
18. Adapter Registry + Sandbox — **closed**
19. Internal Test Harness (pipelines/workflows/governance) — **closed**
20. Internal Benchmark Suite (runtime/pipelines/workflows) — **closed**
21. **New, found while fixing DualPay's stale pgTAP test suite (not closed):** this repo's own `public` schema has a full, real, reachable, *dead* second claims-workbench: `src/data/repository.ts`, `src/lib/queries.ts`, `src/lib/ops-events.ts`, and the live `/organizations` route (`src/routes/_app.organizations.tsx`, confirmed registered in `routeTree.gen.ts`) query `public.claims`, `public.organizations`, `public.cases`, `public.ops_events`, `public.fee_schedules`, `public.payer_contracts`, `public.plan_benefits`, `public.member_accumulators`, `public.edi_errors/edi_segments/edi_transactions` -- table names, RLS policies, and shapes that closely mirror DualPay's own `dualpay.*` schema. Confirmed via row counts: every one of these `public.*` tables has **zero rows** (`public.claims`, `public.organizations`, `public.ops_events` all `count(*) = 0`), while `dualpay.organizations`/`dualpay.ops_events` have real live data. This is either (a) a legitimate nucleus-native admin surface that's simply never been used, or (b) leftover scaffolding from an earlier, abandoned consolidation attempt (before schema-per-app was decided -- see `docs/adr/001-single-supabase-project.md`) that was never cleaned up once `dualpay.*` became the real target. Not resolved here -- deleting a whole reachable route + data layer is a product decision (is this meant to become nucleus's own direct-user surface someday, or is it dead weight?), not a mechanical fix, and deserves its own ADR/decision before anyone touches it.

19 of 20 fully closed; 1 already-live false alarm (11); 1 new, real, unresolved gap found afterward (21). Every item that was safe to close autonomously is closed, including `ResourceGraph` (§1.1) — its "identity-boundary mismatch" turned out to be a misreading of the constitution's own resource model, not a real incompatibility (see that entry). The two items flagged as "genuinely outside this list" have both been resolved: `nucleus-server.ts`'s deployment status was a real decision, not a wiring gap, and it's now decided (§1.1 — internal-only, by design); Federation's topology now has a second real, confirmed link (`valtaris-glue → nucleus`, §1.7), found by actually checking the sibling repos rather than assumed. Item 21 above is the one thing in this document that IS a real, unresolved gap as of this update -- the "nothing left" claim below it in earlier revisions was accurate at the time and is now stale, which is exactly the kind of drift this file's own Build Philosophy (§4) warns against.

22. **Self-caught bug: `reap_stuck_queue_messages`/`nucleus_queue_dead_letters` (ADR-005 closure, same session) were live-exploitable for ~2 hours before being fixed** — closed. Supabase's own security advisor (`get_advisors`, not manual review) caught it: `public.reap_stuck_queue_messages(interval)` was created with no REVOKE/GRANT statements, so Postgres's default PUBLIC-executable grant left it callable by `anon` -- fully unauthenticated -- via `POST /rest/v1/rpc/reap_stuck_queue_messages`, letting anyone force-requeue or terminally fail any organization's stuck queue messages. Worse, `nucleus_queue_dead_letters` (a view over the same table) was owned by a privileged role without `security_invoker = true`, so querying it ran with the *owner's* privileges and bypassed `nucleus_queue_messages`' own RLS policy (`service-role-full-queue-messages`) entirely -- combined with `anon`/`authenticated` both holding a default SELECT grant on the view, this meant any unauthenticated caller could read every organization's failed-queue `payload` (claim/PHI-adjacent data) via `GET /rest/v1/nucleus_queue_dead_letters`. Fixed live: `20260925050000_harden_queue_reaper_surface.sql` revokes PUBLIC/anon/authenticated from both, grants only `service_role`, and sets `security_invoker = true` on the view. Verified via `has_function_privilege`/`has_table_privilege` (all false for anon/authenticated, true for service_role) and a fresh `get_advisors` run (the SECURITY DEFINER view ERROR and both anon/authenticated-executable WARNs are gone). Root cause and lesson: this repo's own established hardening pattern (`harden_public_rpc_surface` migration, explicit REVOKE+GRANT service_role on every privileged function) was not applied to this new function when it was written -- any new SECURITY DEFINER function or view added to a PostgREST-exposed schema needs the same explicit lockdown, not just RLS on the base table, since Postgres's default grants and view-owner-privilege semantics both fail open.

23. **Performance advisor sweep (this session).** Ran the full Supabase performance advisor (481 findings total across dualpay+public+glue; no ERROR-level findings anywhere). Fixed `idx_credentials_*`/`idx_connector_bindings_*` (8 unindexed FK columns, `20260925090000_add_missing_credential_indexes.sql`). Then closed **`auth_rls_initplan`** for this schema too (117 policies calling `auth.<function>()` directly instead of `(select auth.<function>())` in `USING`/`WITH CHECK`, re-evaluating per row instead of once per query): `20260925110000_public_schema_rls_perf_fix.sql`, the exact catalog-driven `DO` block already proven on dualpay's schema (`dualpay/20260924224814_...`, 134 policies) -- dry-run tested in a rolled-back transaction first, then applied; verified live (0 unwrapped remain) and the full test suite (88 tests) + typecheck still pass. `multiple_permissive_policies` was then reviewed and closed too (`20260925130000_public_schema_multiple_permissive_policies_fix.sql`), not with a blind rewrite -- expanded the raw advisor count into concrete role x cmd x table overlaps and found it collapsed into 3 genuinely-repeatable, individually-verified patterns: (1) 12 policies (`*_service_full`/`service-role-full-*`/`replay_cache_service_role_only`) were declared `TO public` with a condition that only ever evaluates true for `service_role` -- since `service_role` has BYPASSRLS and never evaluates policies at all, and the condition is unconditionally false for every other role, the policy contributed nothing to anon/authenticated's OR; rescoped `TO service_role` (zero behavior change, confirmed `has_table_privilege('service_role', ...)` still true after). (2) `member_accumulators`/`payer_contracts`/`plan_benefits`/`weaver_rules` each had a SELECT policy (any org member) and an ALL "write" policy (`has_org_role`: owner/admin/manager) -- since that role check implies membership, the write policy's SELECT contribution was a strict, provable subset of the SELECT policy's; split each ALL policy into INSERT/UPDATE/DELETE only, using the *exact* original condition text to avoid transcription risk. (3) `organization_sso_configs`' SELECT and ALL policies had byte-identical conditions -- dropped the redundant SELECT one. Every change was dry-run tested in a rolled-back transaction first, then applied and verified with real INSERT/UPDATE/SELECT round-trips as an elevated org member (succeeded) and a non-member (correctly 0 rows, not an error) on `member_accumulators`, plus the full test suite. The remaining 5 overlaps (the 5 subsystem-scoped-insert tables' `anon`/`authenticated` `INSERT`) are genuinely different, non-redundant authorization paths -- correctly left as-is, not a gap.

24. **Found while verifying item 23's fix actually worked end-to-end (not just that the policy text changed): a real, live, pre-existing, systemic bug -- `authenticated` had zero EXECUTE grant on `is_org_member`/`has_org_role`/`project_org`, the only three SECURITY DEFINER functions this schema's RLS policies actually call.** Every policy that references them (`organizations`, `projects`, `credentials`, `connector_bindings`, `environments`, `workflows`, `workflow_runs`, `workflow_steps`, `workflow_versions`, `workflow_audit_events`, `organization_members`, `organization_sso_configs`) is scoped `TO authenticated` -- meaning any real signed-in user querying any of these tables directly got a hard `42501: permission denied for function is_org_member` instead of an RLS-filtered result. Same class of bug as dualpay's risk #101 (RISK_REGISTER.md), just not caught until now. Confirmed which functions actually needed it via a regexp scan of every public-schema policy's qual/with_check text (the other SECURITY DEFINER functions in this schema -- `credential_org`, `environment_project`, `is_environment_in_org`/`_project`, `is_project_in_org`, `scope_matches_org_project_environment` -- are only called from trigger functions/CHECK constraints, which fire regardless of the caller's grant, so they didn't need it). Fixed live (`20260925120000_grant_authenticated_rls_chokepoint_functions.sql`), verified by reproducing the exact failing query before the fix and the same query succeeding with correct RLS-filtered results (0 rows for a non-member -- not a leak) after.

---

## 4. Build Philosophy

As we move through phases:

- We **map first**, then build.
- We **consolidate** existing behavior before inventing new modules.
- We **do not rebuild** capabilities that already exist under a different filename.
- We treat Nucleus as the **constitutional spine** and plug everything into it.
- **A module with zero real callers is a gap, even if the file is well-written.** Grep for the exact importer before assuming something works — a class name in a comment is not a caller.
- **A module with an incompatible caller is a trap, not a shortcut.** Wiring in a payload shape or fixture data that doesn't match real production input breaks real claims; it doesn't close a gap. Confirm compatibility (read the real runtimes' actual output, read the candidate's own test suite) before connecting anything.

This file is the source of truth for:

- what exists
- what is partial
- what is missing
- what gets built next

Update this document as systems evolve. (It went stale for the entire PR #9–#19 pass before this update — don't let that happen again: update it in the same PR that changes a status, not after.)
