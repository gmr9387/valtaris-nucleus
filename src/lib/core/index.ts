/**
 * ValtariOS Core — Public Entry Point
 *
 * Single import surface. Substrate modules below are already
 * wired into the running platform (Active). Decision-engine
 * modules below are placeholders with stable contracts only
 * (Architecture Ready) — no extraction has occurred yet.
 */

export * from "./types";
export * from "./contracts";
export { evaluateRules } from "./evaluator";
export type { EvaluatorOutput } from "./evaluator";
export { calculateConfidence } from "./confidence";
export { resolveDecision } from "./decisions";
export { generateTrace } from "./trace";
export { evaluateGovernance } from "./governance";
export { replayEvaluation } from "./replay";
export {
  useOperationsReadiness,
  type OperationsReadiness,
  type AreaReadiness,
  type ReadinessLevel,
} from "./readiness";

export type CoreModuleStatus = "Active" | "Architecture Ready";
export type CoreModuleLayer = "substrate" | "decision-engine";

export interface CoreModuleDescriptor {
  readonly name: string;
  readonly layer: CoreModuleLayer;
  readonly purpose: string;
  readonly status: CoreModuleStatus;
}

export const CORE_MODULE_REGISTRY: readonly CoreModuleDescriptor[] = [
  // ── Platform substrate (Active: in production use today) ──────────────
  {
    name: "tenancy",
    layer: "substrate",
    purpose: "Organizations, memberships, roles, project scoping.",
    status: "Active",
  },
  {
    name: "projects",
    layer: "substrate",
    purpose: "Projects and environments per organization.",
    status: "Active",
  },
  {
    name: "secrets",
    layer: "substrate",
    purpose: "Credential providers, credentials, versions, rotation events.",
    status: "Active",
  },
  {
    name: "connectors",
    layer: "substrate",
    purpose: "Connector registry, versions, capabilities, bindings, health checks.",
    status: "Active",
  },
  {
    name: "workflows",
    layer: "substrate",
    purpose: "Workflow definitions, versions, runs, steps, audit events.",
    status: "Active",
  },
  {
    name: "telemetry",
    layer: "substrate",
    purpose: "Append-only events, metrics, and traces.",
    status: "Active",
  },
  {
    name: "audit",
    layer: "substrate",
    purpose: "Append-only audit log with correlation ids.",
    status: "Active",
  },
  {
    name: "permissions",
    layer: "substrate",
    purpose: "Role-to-permission mapping mirrored by RLS.",
    status: "Active",
  },

  // ── Decision engine (Architecture Ready: contracts only, no logic) ────
  {
    name: "types",
    layer: "decision-engine",
    purpose:
      "Foundational decision-engine vocabulary: Decision, ConfidenceBand, Severity, EvaluationMode, TraceRecord, RuleEvaluation, DecisionCandidate.",
    status: "Architecture Ready",
  },
  {
    name: "contracts",
    layer: "decision-engine",
    purpose: "Strict TypeScript interfaces for Core requests, responses, and per-module results.",
    status: "Architecture Ready",
  },
  {
    name: "evaluator",
    layer: "decision-engine",
    purpose: "Rule execution, condition evaluation, rule firing, candidate generation.",
    status: "Architecture Ready",
  },
  {
    name: "confidence",
    layer: "decision-engine",
    purpose:
      "Data quality, corroboration, contradictions, missing facts, confidence band assignment.",
    status: "Architecture Ready",
  },
  {
    name: "decisions",
    layer: "decision-engine",
    purpose: "Vote aggregation, priority weighting, tie breaking, final decision selection.",
    status: "Architecture Ready",
  },
  {
    name: "trace",
    layer: "decision-engine",
    purpose: "Rule trace, evaluation trace, audit trace, replay trace.",
    status: "Architecture Ready",
  },
  {
    name: "governance",
    layer: "decision-engine",
    purpose: "Rule health, explainability, audit readiness, governance scoring.",
    status: "Architecture Ready",
  },
  {
    name: "replay",
    layer: "decision-engine",
    purpose: "Historical replay, diff generation, version comparison, drift detection.",
    status: "Architecture Ready",
  },
] as const;
