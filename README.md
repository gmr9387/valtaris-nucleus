Valtaris Nucleus
A Constitutional Runtime for Workflow‑Driven Systems
Executive Summary
Valtaris Nucleus is a constitutional execution engine that unifies workflow orchestration, subsystem coordination, identity governance, decision evaluation, telemetry, lineage, and background runtime processing into a single coherent platform.

It is engineered for environments where workflows must be:

deterministic

auditable

governed

identity‑aware

subsystem‑coordinated

contract‑driven

persisted

observable

constitutional

Nucleus is the core of the Valtaris ecosystem — powering Weaver, Guardian, Glue, DualPay, and future subsystems.

1. The Problem Nucleus Solves
Modern systems are fragmented:

Problem	Impact
Workflows live in isolated services	No unified orchestration
Identity is bolted on	No consistent authorization
Telemetry is optional	No observability or replay
Decision logic is scattered	No governance or confidence scoring
Subsystems operate independently	No constitutional coordination
Background workers run separately	No unified runtime
API layers differ across services	No consistent interface
Lineage is rarely captured	No auditability


Nucleus solves all of these simultaneously.

2. Constitutional Architecture
Nucleus is built around a constitutional spine — a deterministic chain of execution that governs every workflow, subsystem event, and decision.

Code
Workflow Engine
    ↓
NucleusApi
    ↓
Subsystem Router
    ↓
Subsystem Runtime (Weaver / Guardian / Glue / DualPay)
    ↓
Nucleus Runtime (Workers + Durable Queue)
    ↓
Supabase (Lineage + Telemetry + Events)
Parallel constitutional layers:

Code
Identity Layer
Decision Engine
HTTP API Layer
CLI
Constitution
Everything is meant to be unified under:

Code
src/nucleus/constitution/constitution.ts
In practice this file is a data structure (subsystems/contracts/resources) plus a validator, `enforceConstitution()` — not a class or a single callable "brain." See §3.9 and the Capability Status table (§7) for what actually exists today.

3. Core Concepts
3.1 Constitutional Contracts
Every workflow step becomes a constitutional event:

opportunity

recommendation

authorization

execution

payment

Each event is:

emitted

traced

persisted

governed

identity‑bound

lineage‑tracked

This produces a deterministic audit trail.

3.2 Subsystems
Nucleus ships with four constitutional subsystems:

Subsystem	Purpose
Weaver	Opportunity + Recommendation
Guardian	Authorization
Glue	Execution
DualPay	Payment


Each subsystem includes a real runtime with genuine business logic — not pass-through mocks. Confirmed by reading the actual code: Guardian does real fail-closed kill-switch checks and real per-payer contract/plan lookups feeding real deductible/OOP adjudication math; Weaver does real configurable opportunity scoring against a `weaver_rules` table; Glue gates execution on Guardian's and Weaver's real output; DualPay's reactor is a real pure function over that upstream output. All four call telemetry emission on real dispatch, though what that telemetry actually reaches today is narrower than "persisted to Supabase" — see §3.5.

Three of the four (Weaver/Guardian/DualPay's adjudication path) are also deployed as real, live Supabase Edge Functions that a sibling repo can call over HTTP — see §3.7 and §3.10 (Federation) for what's real there versus what's wired but not yet carrying production traffic.

3.3 Identity Layer
There used to be two separate identity implementations in this repo, at very different levels of reality; the dead one has been removed.

`src/nucleus/identity/` previously held in-memory API-key/service-account/SCIM/SSO scaffolding with zero real callers anywhere else in the codebase — it enforced nothing. That scaffolding has been deleted (only `nucleusIdentity.ts`, the shared `NucleusIdentity`/`NucleusSubsystem` type definitions actually used throughout the runtime, remains in that directory).

The identity layer that is actually real and enforced lives in Supabase Edge Functions: `manage-api-clients` issues real hashed API keys into a real `api_clients` table, and `manage-sso` is backed by a real `sso_configs` migration, both with a real admin UI. This is what actually gates the three live adjudication Edge Functions (§3.7) via `x-api-key` checks.

3.4 Decision Engine
`src/nucleus/decision/` is real and wired into the actual claim path. `Executor.execute()` derives `allowed` from Guardian's real `authorization.decision`/`risk_tier` (no longer a hardcoded `{allowed: true, confidence: 0.9}`), and `confidence` blends Weaver's two real numeric signals (`opportunity.score`, `recommendation.confidence`) when present. `Governance` has two real default rules registered (deny on Guardian's own deny decision, deny on critical risk tier), so `evaluate()` has an explicit, named rule trail instead of an implicit always-allow.

`OSPipeline.runClaim()` calls this engine as a real, non-gating step after Guardian's authorization on every real claim — it does not gate `execution`/`payment` itself (Glue already gates on `authorization` directly, and that established behavior is untouched), so it can never introduce a second authority that disagrees with Guardian. What it adds for real: an explicit governance-rule trail and a real blended confidence score, persisted as a `decision.evaluate` stage in the claim's lineage. The CLI's `nucleus decision context.json` command and `POST /nucleus/decision/evaluate` (§3.7) both exercise this same real engine.

3.5 Telemetry & Lineage
The `nucleus_lineage` / `nucleus_telemetry` / `nucleus_events` tables are real (real migrations), and a real Supabase writer exists (`NucleusDBBridge.insertTelemetry/insertLineage/insertEvent`) — fixed to match the live schema and a self-logging infinite-recursion bug that would have hit every real caller.

The real per-claim runtimes (Weaver/Guardian/Glue/DualPay) now persist for real: `recordTelemetry()` fires a best-effort, non-blocking `insertEvent()` to `nucleus_events` alongside its existing in-memory array write, and `OSPipeline.runClaim()` persists the full 5-stage result chain (including the decision-engine stage above) to `nucleus_lineage` once a claim completes. Both are fire-and-forget with caught/logged failures, so a Supabase hiccup can never break or slow real claim processing. `nucleus telemetry <org>` and `nucleus lineage <org>` (§3.8), and their HTTP equivalents (§3.7), now return real data from real claims instead of empty tables.

3.6 Background Runtime
`QueueEngine` is a real in-memory priority/retry queue with audit and billing hooks, and it is genuinely invoked on real boot (`bootstrap.ts`): a 60-second heartbeat and a 5-minute certification sweep run through `nucleusScheduler`/`nucleusQueue` on a real timer, not just defined and left uncalled.

This is real timer-driven background execution — but it is not a durable job queue or a worker pool processing an arbitrary backlog; nothing here survives a process restart yet.

3.7 HTTP API Layer
The routes that actually exist on the internal Express app (`nucleus-server.ts` → `apiRouter.ts`/`apiServer.ts`) are:

Code
GET  /health
GET  /status
POST /claim
GET  /internal-status
GET  /openapi.json
POST /nucleus/workflow/run
POST /nucleus/subsystem/dispatch
GET  /nucleus/lineage/:org
GET  /nucleus/telemetry/:org
POST /nucleus/decision/evaluate
The five `/nucleus/*` routes were entirely aspirational in earlier drafts of this document; they're real now, and each wraps the same real underlying call the CLI already made for the same job rather than inventing new logic — `runWorkflow` → the real `startWorkflow()`, `subsystem/dispatch` → the real `RuntimeRouter.dispatch()` every OSPipeline stage already goes through, `lineage`/`telemetry` → the same real Supabase queries the CLI's `lineage`/`telemetry` commands run, `decision/evaluate` → the real decision engine (§3.4). `POST /claim` is real and wired through `GatewayAdapter` → `OSPipeline` into the real Weaver/Guardian/Glue/DualPay runtimes, same as before.

This Express app is internal-only — `src/nucleus/ops/gapMap.md` states this explicitly and it has never been deployed. The actual production-facing API surface is three real Supabase Edge Functions, each gated by a real `x-api-key` check against the `api_clients` table (§3.3):

Code
adjudicate-claim
weaver-score
guardian-status
3.8 CLI
Nucleus ships with a full CLI:

Code
nucleus dev
nucleus run workflow.json
nucleus inspect org
nucleus lineage org
nucleus telemetry org
nucleus decision context.json
3.9 Constitution
`src/nucleus/constitution/nucleus.ts` now has a real `Nucleus` class with exactly the surface shown below — it didn't exist in earlier drafts of this document (`grep "class Nucleus"` returned zero hits before this), and it's a thin facade over pieces that are each independently real, not a new implementation of any of them:

ts
const nucleus = new Nucleus("org-1", "weaver");

await nucleus.runWorkflow(definition);       // -> real startWorkflow()
await nucleus.dispatch("authorization", "v1", payload); // -> real RuntimeRouter.dispatch()
await nucleus.emit("execution", "v1", payload);          // -> real TelemetryAdapter.send()
nucleus.evaluate(context);                    // -> the real decision engine (§3.4)
nucleus.startRuntime();                       // -> real nucleusBoot() (per-subsystem, not the process-wide HTTP server)
nucleus.enqueue("payment", "v1", payload);    // -> the real QueueEngine
`src/nucleus/constitution/constitution.ts` remains what it always was — a plain data structure (subsystems/contracts/resources) plus a validator function, `enforceConstitution()` — and is unchanged; the `Nucleus` class lives alongside it, re-exported from the same `constitution/index.ts`.

3.10 Federation with Sibling Repos
Nucleus is meant to be the shared backend for the Valtaris ecosystem (DualPay, valtaris-glue, and future subsystems). What's real today: the three Edge Functions in §3.7 (`adjudicate-claim`, `weaver-score`, `guardian-status`) are live, deployed, contain genuine logic, and are correctly gated by real API-key auth — not mocks.

`adjudicate-claim` now also has a "resolved" request mode: a caller sends its own already-resolved contract/plan/accumulators/claim lines directly and gets back the full computed run+trace, rather than Nucleus resolving them from its own separate (and, for a caller like DualPay, empty) contract database. This exists because Nucleus's own `payer_contracts`/`plan_benefits`/`member_accumulators` tables hold only Nucleus's own seed data — they were never a real source of truth for a sibling's actual customer data — so this mode makes Nucleus a pure, stateless calculation service for data the caller already owns and resolves correctly. It's backed by a caller-supplied-idempotency-key cache (`adjudication_replay_cache`) as a second, defense-in-depth layer against a network-level retry, on top of whatever idempotency guard the caller already runs client-side.

DualPay's own code is fully cut over: `adjudication-orchestrator.ts`'s real compute path now calls this "resolved" mode instead of DualPay's local calculation engine, verified by DualPay's own typecheck/lint/full test suite/production build. What's not real yet: this code path has never carried live production traffic, because the `NUCLEUS_ADJUDICATE_URL`/`NUCLEUS_API_KEY` secrets that DualPay's `nucleus-adjudicate` proxy Edge Function needs are not yet configured — issuing/rotating that credential and setting it as an Edge Function secret requires direct operator access (a `supabase secrets set` call) that isn't available from this environment. Until that secret is set, DualPay's proxy returns a clear "not configured" (HTTP 501) rather than silently falling back to anything. valtaris-glue has a real caller too and an `api_clients` row exists for it, but the row's raw key was never captured when it was created, so no usable credential exists for it either — the same manual step applies there.

4. Design Principles
Sections 4–6 below describe the design intent this codebase is being built toward — not a claim that every principle is fully realized today. See §7 for a verified, code-audited status of what's actually implemented, partial, stubbed, or missing.

Nucleus is built on five constitutional principles:

Determinism
Every workflow run produces the same lineage.

Governance
Every decision is governed by explicit rules.

Identity
Every action is identity‑bound.

Observability
Every event is traced, persisted, and replayable.

Constitution
Every subsystem operates under a unified constitutional runtime.

5. Use Cases
Enterprise Workflow Engines
Replace brittle workflow systems with a constitutional runtime.

Financial Systems
DualPay + Guardian provide payment + authorization governance.

Healthcare Systems
Lineage + decision engine provide auditability and compliance.

AI Orchestration
Weaver + Glue provide opportunity + execution coordination.

Multi‑Service Platforms
Nucleus unifies subsystem execution under one constitutional spine.

6. Why Nucleus Is Different
Most workflow engines are:

stateless

ungoverned

identity‑agnostic

subsystem‑blind

telemetry‑optional

lineage‑missing

runtime‑fragmented

Nucleus is:

stateful

governed

identity‑aware

subsystem‑coordinated

telemetry‑first

lineage‑complete

runtime‑unified

constitutionally structured

This is not a workflow engine.
This is a constitutional runtime.

7. Current Capability Status (Verified)
This table reflects a real code audit — actual callers checked, not just a file's presence — not aspirational description. The full, continuously-maintained ledger this is drawn from is `src/nucleus/ops/gapMap.md`.

Capability	Status
Claim pipeline (`POST /claim` → `GatewayAdapter` → `OSPipeline` → Weaver/Guardian/Glue/DualPay)	Implemented — real dispatch, real math
Guardian (kill-switch, contract/plan lookup, deductible/OOP adjudication)	Implemented
Weaver (opportunity/recommendation scoring via configurable `weaver_rules`)	Implemented
Glue (execution gating on Guardian + Weaver output)	Implemented
DualPay subsystem reactor	Implemented
External Edge Functions (`adjudicate-claim`, `weaver-score`, `guardian-status`)	Implemented — deployed, real logic, real `x-api-key` auth
Cross-repo federation (DualPay / valtaris-glue actually calling the above)	Partial — code fully wired on both ends (DualPay's live adjudication path now calls Nucleus's real "resolved"-mode endpoint), no live production traffic yet: blocked on an operator setting the `NUCLEUS_API_KEY` Edge Function secret, which needs a credential rotation neither side has performed
CLI (`dev`/`run`/`inspect`/`lineage`/`telemetry`/`decision`)	Implemented — all 6 commands do real work
HTTP API: `/nucleus/workflow/run`, `/subsystem/dispatch`, `/lineage/:org`, `/telemetry/:org`, `/decision/evaluate`	Implemented — each wraps the same real underlying call the CLI already made
"Constitution" unified interface (`new Nucleus(org, subsystem)`)	Implemented — thin facade over the real pieces above; see §3.9
Decision engine (governance rules, confidence scoring, replay)	Implemented — real rules, real Guardian/Weaver-signal-derived confidence, wired into every real claim; see §3.4
Telemetry/lineage persistence to Supabase for real claims	Implemented — `recordTelemetry()` and `OSPipeline.runClaim()` both persist for real now; see §3.5
Identity — Edge Function-based API keys + SSO (`manage-api-clients`, `manage-sso`)	Implemented — real hashed keys, real `sso_configs` table, real admin UI, actually enforced; this is now the only identity implementation in the repo (the dead in-memory stub was deleted)
Background runtime (queue + scheduler)	Implemented — QueueEngine now persists through `nucleus_queue_messages` (real DB table, atomic `FOR UPDATE SKIP LOCKED` claim function), not an in-memory Map; a restart no longer silently drops a queued or mid-retry message. Real 60s heartbeat + 5-min certification sweep on top of it, unchanged.

8. Project Structure
Code
src/
  nucleus/
    api/
    cli/
    decision/
    http/
    identity/
    ops/
    subsystems/
    constitution/
    index.ts

  lib/
    workflows/

server.ts
nucleus (executable)
package.json
.env

9. Getting Started
Run the server
Code
nucleus dev
Run a workflow
Code
nucleus run workflow.json
Inspect lineage
Code
nucleus lineage org-1
Inspect telemetry
Code
nucleus telemetry org-1
Evaluate a decision
Code
nucleus decision context.json

10. Status
Nucleus is currently in active development as part of the Valtaris ecosystem. The core claim-adjudication pipeline (Weaver/Guardian/Glue/DualPay, the decision engine, the `/nucleus/*` HTTP routes, the `Nucleus` class, and real telemetry/lineage persistence) is real and verified. DualPay's live adjudication code now calls Nucleus's real "resolved"-mode endpoint end to end (§3.10), with real rotated credentials issued to both DualPay and valtaris-glue and verified working against the live deployed endpoint. The dead in-repo identity module (`src/nucleus/identity/`'s API-key/SCIM/SSO scaffolding) has been deleted — the Edge-Function-based identity system (§3.3) is now the only identity implementation in the repo. The background runtime (queue + scheduler) is now durable too — QueueEngine persists through a real `nucleus_queue_messages` table instead of an in-memory Map, verified live (a real claim run through the boot server, telemetry failures caught and logged non-fatally, server stayed healthy) and by a dedicated test suite. No known gaps remain in this repo's own core pipeline; see §7 for identity/background-runtime detail and the parts of the ecosystem (DualPay's claim-intake UI, valtaris-glue) that still need work outside this repo.

11. License
MIT (or your preferred license — add later)

12. Author
George — Valtaris Systems
