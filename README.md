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
There are two separate identity implementations in this repo, at very different levels of reality.

`src/nucleus/identity/` (API keys, service accounts, a SCIM provider, an SSO provider) is in-memory scaffolding with zero real callers anywhere else in the codebase — it enforces nothing today.

The identity layer that is actually real and enforced lives in Supabase Edge Functions, not in this directory: `manage-api-clients` issues real hashed API keys into a real `api_clients` table, and `manage-sso` is backed by a real `sso_configs` migration, both with a real admin UI. This is what actually gates the three live adjudication Edge Functions (§3.7) via `x-api-key` checks.

3.4 Decision Engine
`src/nucleus/decision/` exists but is currently a stub, disconnected from the real claim path: `Executor.execute()` unconditionally returns `{allowed: true, confidence: 0.9, reasons: ["base-allow"]}`, `Governance` has no rules registered by any real caller, `Confidence.score()` is a plain arithmetic mean, and `Replay` is in-memory only.

Real authorization and risk scoring for actual claims happen directly inside the Guardian and Weaver subsystem runtimes (§3.2) — real fail-closed kill-switch checks, real contract/plan lookups, real configurable scoring rules — not through this decision engine. The CLI's `nucleus decision` command exercises the stub, not the real path.

3.5 Telemetry & Lineage
The `nucleus_lineage` / `nucleus_telemetry` / `nucleus_events` tables are real (real migrations), and a real Supabase writer exists (`NucleusDBBridge.insertTelemetry/insertLineage/insertEvent`).

What's not yet true: the real per-claim runtimes (Weaver/Guardian/Glue/DualPay) currently call `recordTelemetry()`, which only appends to an in-process array (console.log + push) — it does not write to Supabase. `insertLineage` and `insertEvent` have zero real callers anywhere in the codebase today. So `nucleus telemetry <org>` and `nucleus lineage <org>` (§3.8) query real tables that real claim processing doesn't currently populate. Wiring the real runtimes' telemetry emission into `NucleusDBBridge` is the actual remaining gap here, not a UI or schema problem.

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
None of the `/nucleus/workflow/run` / `/nucleus/subsystem/dispatch` / `/nucleus/lineage/:org` / `/nucleus/telemetry/:org` / `/nucleus/decision/evaluate` routes described in earlier drafts of this document exist. `POST /claim` is real and wired through `GatewayAdapter` → `OSPipeline` into the real Weaver/Guardian/Glue/DualPay runtimes.

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
There is no `Nucleus` class anywhere in this codebase — `new Nucleus("org-1", "weaver")` and the `runWorkflow`/`dispatch`/`emit`/`evaluate`/`startRuntime`/`enqueue` surface shown in earlier drafts of this document do not exist (`grep "class Nucleus"` returns zero hits).

`src/nucleus/constitution/constitution.ts` is real, but it's a plain data structure (subsystems/contracts/resources) plus a validator function, `enforceConstitution()`, that checks a dispatch against it — not a callable unified interface. The real entry points into the runtime today are `OSPipeline.runClaimFromGateway()` (the real dispatch path used by `POST /claim`) and the CLI (§3.8).

3.10 Federation with Sibling Repos
Nucleus is meant to be the shared backend for the Valtaris ecosystem (DualPay, valtaris-glue, and future subsystems). What's real today: the three Edge Functions in §3.7 (`adjudicate-claim`, `weaver-score`, `guardian-status`) are live, deployed, contain genuine logic, and are correctly gated by real API-key auth — not mocks.

What's not real yet: no live production traffic actually flows across this boundary. DualPay has real deployed proxy functions and client wrappers for calling these endpoints, but its live UI still runs its own local adjudication engine instead of calling out to Nucleus. valtaris-glue has a real caller too, but no `api_clients` credential has been issued for it yet, so its calls hit a mock fallback. `src/nucleus/federation/registerKnownTopology.ts` documents this state accurately — both ends of the wiring exist, but the federation is not yet load-bearing.

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
Cross-repo federation (DualPay / valtaris-glue actually calling the above)	Partial — both ends wired, no live production traffic yet
CLI (`dev`/`run`/`inspect`/`lineage`/`telemetry`/`decision`)	Implemented — all 6 commands do real work
HTTP API surface described in early drafts of this doc (`/nucleus/workflow/run` etc.)	Not implemented — real routes are `/health`, `/status`, `/claim`, `/internal-status`, `/openapi.json`
"Constitution" unified interface (`new Nucleus(org, subsystem)`)	Not implemented — no such class exists; `constitution.ts` is data + a validator
Decision engine (governance rules, confidence scoring, replay)	Stub — hardcoded `{allowed: true, confidence: 0.9}`, disconnected from the real claim path
Telemetry/lineage persistence to Supabase for real claims	Partial — tables and a writer are real; the real runtimes' telemetry calls don't reach that writer today
Identity — in-repo API keys/service accounts/SCIM/SSO (`src/nucleus/identity/`)	Stub — in-memory, zero enforcement, zero real callers
Identity — Edge Function-based API keys + SSO (`manage-api-clients`, `manage-sso`)	Implemented — real hashed keys, real `sso_configs` table, real admin UI, actually enforced
Background runtime (queue + scheduler)	Partial — real in-memory priority/retry queue on a real 60s heartbeat + 5-min certification sweep; not a durable/restart-surviving job queue

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
Nucleus is currently in active development as part of the Valtaris ecosystem. The core claim-adjudication pipeline (Weaver/Guardian/Glue/DualPay, and the three external Edge Functions) is the most trustworthy, load-bearing part of this codebase today. The decision engine, in-repo identity module, and the `/nucleus/*`/`Nucleus`-class surface described in earlier drafts of this README are not yet real — see §7.

11. License
MIT (or your preferred license — add later)

12. Author
George — Valtaris Systems
