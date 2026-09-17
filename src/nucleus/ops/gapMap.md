# Valtaris Nucleus – System Inventory & Gap Map

This document is the canonical map of what already exists in the Valtaris ecosystem and what is still missing. It prevents duplication and ensures we only close real gaps instead of rebuilding the same capability under different filenames.

**Last verified against the real codebase:** 2026-09-17, after PRs #9–#22 (the NucleusApi retirement) plus multi-tenant subsystem activation (`tenantSubsystemOverrides.ts`). Everything below reflects actual importers/callers checked directly, not file existence. Where a status changed, the entry says what changed it and how it was verified.

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
- Adapter Registry (`adapterAutoWireEngine`) + Constitutional Pipeline (`constitutionalPipeline.execute()`) — both now run on real boot (`DeploymentBootstrap.start()`), not just `bun run ci`
- `AuditEngine.report()` — real aggregation, exercised by CI's `"audit.tests"`
- `GET /api/openapi.json` — real generator wired to the real routes
- `GET /api/internal-status` + `GET /status` — a real JSON endpoint and HTML page exposing all of the above from one place
- `BenchmarkEngine.run()` — real claims through the real pipeline, real min/max/avg/p50/p95 timing, exposed via the CLI's `benchmark` command and CI's `"benchmark.tests"`
- `AdapterSandbox` — transitive dependency resolution for a candidate adapter (or the whole manifest) in isolation from the real, shared `adapterState.loaded`; catches an unknown adapter or a dependency cycle before a real boot would
- Telemetry consolidated: `telemetryEngine.ts`'s `recordEvent()`/`list()` now delegate to `telemetry/telemetry.ts`'s live store instead of keeping a second, boot-only array (see §2.2)

**Retired, not a gap:** `NucleusApi`, `NucleusBatchApi`, the `"contracts"` subsystem (`ContractsRuntime` → `OpportunityRuntime`/`RecommendationRuntime`/`AuthorizationRuntime`/`ExecutionRuntime`/`PaymentRuntime`), `FederatedResourceEngine`, `federatedLineageEngine`, and `federatedTelemetryEngine` were deleted outright rather than retrofitted. This was a parallel, early-prototype "constitutional contract chain" with hardcoded fixture tenants and a payload shape (`executionType`, flat `amount`) the real Guardian/Glue/DualPay runtimes never produced, confirmed incompatible by reading its own test suite's expected shapes — never dispatched via `RuntimeRouter` on the real claim path. Its five dedicated test files (which tested only this prototype's own mechanics) were deleted alongside it. `federationEngine.identity` (tenant/environment validation, a separate and genuinely live sub-engine) was kept.

**Gaps:**
- `ResourceGraph` is still never populated by real dispatch. Investigated directly: its identity-boundary guard (`enforceResourceGuards`) assumes one resource belongs to a single fixed (subsystem, capability) pair, which doesn't fit a claim four different subsystems each touch once with a different capability. Wiring it in as originally imagined would either throw on the guard or duplicate what State + Lineage already do — not a real gap closure.
- `nucleus-server.ts` (this whole internal engine) is not deployed anywhere. Real production traffic runs through the Supabase Edge Functions (`adjudicate-claim` et al.) and the separate TanStack admin app. Everything above is live in the sense that it runs correctly when the process runs, not in the sense of serving real production traffic today.

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
- Unified audit engine integration — audit logging exists per-engine (billing + audit hooks on every engine touched this pass); not consolidated into one cross-engine report beyond `AuditEngine.report()`'s aggregation
- Versioned governance rules (diffs + snapshots) — not built; `StateEngine`'s diff/snapshot capability exists generically but hasn't been applied to rule/policy history specifically

---

### 1.4 DualPay (Payment Orchestration)

**Status:** Live for its one real contract (`payment`).

**Existing:**
- Routing logic (`DualPayEngine.react()`) — pure, deterministic, driven by real Guardian adjudication output
- Real telemetry recording (was missing; fixed this pass — DualPay was the one of four real runtimes that never called `recordTelemetry()`)
- Real federation link registered: DualPay → nucleus's live `adjudicate-claim` Edge Function

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

**Gaps:**
- Versioned certifications (history + snapshots) — not built

---

### 1.7 Federation Layer

**Status:** Live, from confirmed real data.

**Existing:**
- `federationEngine.identity` (tenant/environment validation) — already live before this pass, used across certification/ci/dashboard/cliSovereign/sovereignty
- Real topology (`registerKnownTopology.ts`): nucleus's live Supabase Edge Function surface, DualPay/valtaris-glue/rre-os-guardian as real (undeployed) repos, one real link (DualPay → nucleus's `adjudicate-claim`)

**Gaps:**
- No live network topology beyond the one confirmed link — Glue and rre-os-guardian have no confirmed real link to register yet
- Multi-tenant runtime/deployment hooks — handled outside this pass (Supabase-side SSO/tenancy work), not independently re-verified inside `src/nucleus/*`

---

### 1.8 Shell + CLI

**Status:** Live for the commands this pass touched.

**Existing:**
- `certify`, `pipeline`, `adapters`, `ci`, `benchmark` commands all point at real, live mechanisms now (previously some pointed at weaker/broken paths)
- Fixed: `cliManifest.ts`'s command allowlist was missing `"deploy"` and `"certify"` — both real, working commands that would have thrown "Unknown command" if anyone actually ran them. `shellCommands.ts`'s `help` list now reads from the manifest directly instead of a separately hand-maintained copy that had gone stale.
- Test harness integration — `bun run ci`'s `"dispatch.tests"`, `"sandbox.tests"`, and `"adapter-sandbox.tests"` genuinely exercise the claim path and both sandboxes' isolation, not just individual engines

**Gaps:**
- Unified diagnostics/health/metrics CLI commands specifically — the engines are real; dedicated CLI surfacing of them beyond what `certify`/`ci`/`benchmark` already show wasn't built

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

19 of 20 fully closed; 1 already-live false alarm (11). Every item that was safe to close autonomously is closed. What's left is judgment calls, not wiring: `ResourceGraph`'s identity-boundary mismatch (§1.1), and whatever the ecosystem needs next that isn't on this specific list (e.g. deploying `nucleus-server.ts` somewhere real, or extending Federation's topology beyond the one confirmed link).

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
