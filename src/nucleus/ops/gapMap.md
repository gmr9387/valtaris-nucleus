# Valtaris Nucleus – System Inventory & Gap Map

This document is the canonical map of what already exists in the Valtaris ecosystem and what is still missing. It prevents duplication and ensures we only close real gaps instead of rebuilding the same capability under different filenames.

---

## 1. Subsystem Inventory

### 1.1 Nucleus (Runtime)

**Status:** 70–80% complete

**Existing:**
- Event bus (local to runtime)
- Telemetry hooks
- Workflow state handling
- Deterministic execution loop
- Subsystem activation
- Constitutional enforcement
- Partial scheduler
- Partial retries
- Partial recovery
- Versioning concepts
- Audit/event logging
- Resource federation concepts
- HTTP/API surfaces
- Subsystem registration
- Contract infrastructure

**Gaps:**
- Unified event bus across subsystems
- Unified telemetry/metrics spine
- Unified audit engine (reports + proofs)
- Fully implemented scheduler + retries + recovery
- Durable, centralized state store abstraction

---

### 1.2 Glue (Workflow / Pipeline Engine)

**Status:** 80–90% complete

**Existing:**
- Pipeline execution
- Workflow state machine
- Adapter execution
- Lineage logging
- Event emission
- Deterministic transitions
- Contract enforcement
- Resource mapping

**Gaps:**
- Formal adapter registry
- Adapter sandboxing (safe execution)
- Centralized state store integration
- Unified event bus integration

---

### 1.3 Guardian (Governance Engine)

**Status:** 70–80% complete

**Existing:**
- Rule enforcement
- Constitutional checks
- Compliance hooks
- Governance events
- Audit logging
- Contract validation

**Gaps:**
- Governance sandbox (rule validation + isolation)
- Unified audit engine integration
- Unified event bus integration
- Versioned governance rules (diffs + snapshots)

---

### 1.4 DualPay (Payment Orchestration)

**Status:** 60–70% complete

**Existing:**
- Routing logic
- Settlement flows
- Reconciliation logic
- Certification hooks
- Pipeline integration

**Gaps:**
- Full integration with unified event bus
- Full integration with unified state store
- Multi‑tenant payment isolation hooks
- Formal failure/retry/recovery policies

---

### 1.5 Weaver (Subsystem Registry)

**Status:** 70–80% complete

**Existing:**
- Subsystem registry
- Subsystem activation
- Dependency mapping
- Environment activation

**Gaps:**
- Formal subsystem dependency graph
- Deployment engine integration
- Multi‑tenant subsystem activation rules

---

### 1.6 Certification Engine

**Status:** 60–70% complete

**Existing:**
- Sovereignty proofs
- Pipeline certification
- Workflow certification
- Environment certification

**Gaps:**
- Certification sandbox (proof generation + validation)
- Unified audit engine integration
- Versioned certifications (history + snapshots)

---

### 1.7 Federation Layer

**Status:** 50–60% complete

**Existing:**
- Tenant isolation concepts
- Resource federation concepts
- Tenant mapping
- Multi‑tenant hooks

**Gaps:**
- Fully implemented multi‑tenant runtime hooks
- Fully implemented multi‑tenant deployment hooks
- Formal resource federation engine (providers/payers/desks)

---

### 1.8 Shell + CLI

**Status:** 70–80% complete

**Existing:**
- Commands for dev/runtime
- Subsystem activation
- Pipeline execution
- Workflow execution
- Certification commands

**Gaps:**
- Unified diagnostics commands
- Unified health/metrics commands
- Test harness integration (pipelines/workflows/governance)

---

## 2. Cross‑Cutting Capabilities

These exist in pieces and must be consolidated rather than rebuilt.

### 2.1 Event Bus

**Existing:**  
- Local event emission in Nucleus, Glue, Guardian, DualPay

**Gap:**  
- One unified event bus module used by all subsystems.

---

### 2.2 Telemetry / Metrics

**Existing:**  
- Telemetry hooks in Nucleus and lineage tables in Supabase.

**Gap:**  
- Central metrics spine (runtime, pipelines, workflows, governance).

---

### 2.3 Workflow / Pipeline State

**Existing:**  
- State machines and state handling in Glue.

**Gap:**  
- Central state store abstraction shared by Nucleus + Glue + Guardian.

---

### 2.4 Durable Queues

**Existing:**  
- Partial durable queue behavior in Nucleus runtime.

**Gap:**  
- Formal queue layer with clear API and retry semantics.

---

### 2.5 Scheduler

**Existing:**  
- Partial scheduling logic in Nucleus.

**Gap:**  
- Unified scheduler for timed pipelines, workflows, and governance rules.

---

### 2.6 Retries

**Existing:**  
- Partial retry behavior in runtime.

**Gap:**  
- Unified retry engine with policies per subsystem/pipeline.

---

### 2.7 Recovery

**Existing:**  
- Partial recovery logic in runtime.

**Gap:**  
- Unified recovery engine for failed pipelines/workflows.

---

### 2.8 Versioning

**Existing:**  
- Conceptual versioning of workflows/governance.

**Gap:**  
- Snapshot + diff engine for pipelines, workflows, and rules.

---

### 2.9 Audit / Event Logging

**Existing:**  
- Audit/event logging in Nucleus, Guardian, Certification.

**Gap:**  
- Central audit engine that produces reports + proofs.

---

### 2.10 Resource Federation

**Existing:**  
- Concepts for providers/payers/desks/tenants.

**Gap:**  
- Formal federation engine with mapping + resolution APIs.

---

### 2.11 API / OpenAPI Surfaces

**Existing:**  
- Per‑subsystem HTTP/API surfaces.

**Gap:**  
- Unified API gateway + unified OpenAPI spec.

---

### 2.12 Subsystem Registration

**Existing:**  
- Weaver registry and activation logic.

**Gap:**  
- Formal dependency graph + lifecycle hooks.

---

### 2.13 Contract Infrastructure

**Existing:**  
- Contract enforcement in Nucleus/Glue/Guardian.

**Gap:**  
- Central contract validator + shared contract types.

---

## 3. True Missing Systems (To Be Built)

These do not exist yet and represent real gaps:

1. Unified Event Bus module (used by all subsystems)  
2. Unified Telemetry/Metrics spine  
3. Unified Audit Engine (reports + proofs)  
4. Central State Store abstraction  
5. Formal Queue Layer  
6. Unified Scheduler  
7. Unified Retry Engine  
8. Unified Recovery Engine  
9. Snapshot Engine (pipelines/workflows/governance)  
10. Diff Engine (pipelines/workflows/governance)  
11. Unified API Gateway  
12. Unified OpenAPI documentation  
13. Multi‑Tenant Runtime Hooks (fully implemented)  
14. Multi‑Tenant Deployment Hooks (fully implemented)  
15. Resource Federation Engine (formalized)  
16. Certification Sandbox  
17. Governance Sandbox  
18. Adapter Registry + Sandbox  
19. Internal Test Harness (pipelines/workflows/governance)  
20. Internal Benchmark Suite (runtime/pipelines/workflows)

---

## 4. Build Philosophy

As we move through phases:

- We **map first**, then build.  
- We **consolidate** existing behavior before inventing new modules.  
- We **do not rebuild** capabilities that already exist under a different filename.  
- We treat Nucleus as the **constitutional spine** and plug everything into it.

This file is the source of truth for:

- what exists  
- what is partial  
- what is missing  
- what gets built next

Update this document as systems evolve.
