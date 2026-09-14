/**
 * ValtariOS Core — Foundational Types
 *
 * Permanent home for the shared decision engine type vocabulary.
 * No runtime logic. No behavior changes. Definitions only.
 */

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type ConfidenceBand = "low" | "medium" | "high" | "very_high";

export type EvaluationMode =
  "instant" | "deep" | "assisted" | "live" | "replay" | "shadow" | "dry_run";

export type DecisionOutcome =
  "approve" | "deny" | "review" | "escalate" | "flag" | "request_info" | "unresolved";

export interface Decision {
  id: string;

  outcome: DecisionOutcome;

  confidence: number;

  confidenceBand: ConfidenceBand;

  severity: Severity;

  rationale: string;

  createdAt: string;
}

export interface RuleEvaluation {
  ruleId: string;

  ruleVersion?: number;

  ruleSnapshotId?: string | null;

  ruleName?: string;

  fired: boolean;

  weight: number;

  reason?: string;

  evidenceRefs?: string[];
}

export interface DecisionCandidate {
  outcome: DecisionOutcome;

  weight: number;

  supportingRules: string[];

  contradictingRules: string[];
}

export interface TraceRecord {
  traceId: string;

  step: string;

  at: string;

  detail?: Record<string, unknown>;
}

export interface DecisionTrace {
  traceId: string;

  evaluatedAt: string;

  mode: EvaluationMode;

  decision: DecisionOutcome;

  confidence: number;

  confidenceBand: ConfidenceBand;

  severity: Severity;

  ruleEvaluations: RuleEvaluation[];

  records?: TraceRecord[];
}
