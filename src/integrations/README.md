# Nucleus Integrations Layer  
The Nucleus Integrations Layer is the control plane that connects all major subsystems of the Valtaris ecosystem.  
Nucleus is the **octopus head**.  
All other systems are **arms** extending from it.

This directory contains the specifications and integration points for:

- Glue (Workflow Engine)
- Decision Weaver (Decision Intelligence)
- Guardian (Risk & Governance)
- DualPay (Payments & Ledgering)

Nucleus provides the unified foundation that all arms rely on.

---

## Architecture Overview

### Nucleus = Head  
Nucleus owns:

- Identity  
- Resource hierarchy  
- Contracts  
- Event bus  
- Telemetry  
- Error model  
- Integration registry  

Every subsystem plugs into Nucleus through these interfaces.

### Arms = Subsystems  
Each subsystem provides a specialized capability:

| Subsystem        | Capability |
|------------------|------------|
| **Glue**         | Workflow orchestration & authoring |
| **Decision Weaver** | Deterministic decision engine, rule evaluation, simulation |
| **Guardian**     | Governance, rule enforcement, risk scoring |
| **DualPay**      | Payments, ledgering, reconciliation |

All arms communicate through Nucleus.

---

## Integration Components

### 1. Integration Registry (`integrationRegistry.ts`)
Central list of all subsystems connected to Nucleus.

### 2. Event Bus (`eventBus.ts`)
Unified event model for workflows, decisions, governance, and payments.

### 3. Contract Layer (`contracts.ts`)
Defines the rules each subsystem must obey.

### 4. Identity Binding (`identityBinding.ts`)
Unifies tenant, project, environment, and actor identity across all subsystems.

### 5. Resource Hierarchy (`resourceHierarchy.ts`)
Defines ownership and scoping of all resources.

### 6. Error Model (`errorModel.ts`)
Unified error reporting across the ecosystem.

### 7. Telemetry Model (`telemetry.ts`)
Unified logs, metrics, traces, and subsystem health.

---

## Why This Layer Exists

The Valtaris ecosystem is not a collection of apps — it is a **platform**.

Nucleus ensures:

- deterministic behavior  
- consistent identity  
- consistent governance  
- consistent telemetry  
- consistent contracts  
- consistent event routing  

This layer is the backbone of multi-tenant SaaS, compliance automation, workflow automation, decision intelligence, and financial operations.

---

## Subsystem Responsibilities

### Glue  
Publishes workflow events, errors, and telemetry.  
Obeys workflow contracts.  
Uses identity and resource hierarchy.

### Decision Weaver  
Publishes decision events and rule evaluations.  
Obeys decision contracts.  
Uses identity and resource hierarchy.

### Guardian  
Publishes governance events and violations.  
Obeys governance contracts.  
Uses identity and resource hierarchy.

### DualPay  
Publishes payment events and ledger updates.  
Obeys payment contracts.  
Uses identity and resource hierarchy.

---

## The Octopus Model

