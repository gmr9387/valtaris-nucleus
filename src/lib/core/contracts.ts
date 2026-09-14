/**
 * ValtariOS Core — Module Contracts
 *
 * Strict interfaces that every Core module must satisfy.
 * These contracts are the public surface for cross-product integration.
 */

import type {
  ConfidenceBand,
  Decision,
  DecisionCandidate,
  DecisionTrace,
  EvaluationMode,
  RuleEvaluation,
  Severity,
  TraceRecord,
} from "./types";

export interface CoreEvaluationRequest {
  readonly organizationId: string;

  readonly subjectId: string;

  readonly mode: EvaluationMode;

  readonly facts: Readonly<Record<string, unknown>>;

  readonly rulesetVersion?: string;

  readonly correlationId?: string;
}

export interface CoreEvaluationResponse {
  readonly decision: DecisionResult;

  readonly confidence: ConfidenceResult;

  readonly trace: TraceResult;

  readonly governance: GovernanceResult;
}

export interface DecisionResult {
  readonly decision: Decision;

  readonly candidates: readonly DecisionCandidate[];

  readonly tieBreaker?: string;
}

export interface ConfidenceResult {
  readonly score: number;

  readonly band: ConfidenceBand;

  readonly missingFacts: readonly string[];

  readonly contradictions: readonly string[];

  readonly corroboratingSignals?: number;

  readonly dataQuality?: number;
}

export interface ReplayResult {
  readonly originalDecisionId: string;

  readonly replayedDecisionId: string;

  readonly drift: boolean;

  readonly diff: Readonly<
    Record<
      string,
      {
        before: unknown;
        after: unknown;
      }
    >
  >;
}

export interface GovernanceResult {
  readonly score: number;

  readonly severity: Severity;

  readonly explainable: boolean;

  readonly auditReady: boolean;

  readonly findings: readonly string[];
}

export interface TraceResult {
  readonly traceId: string;

  readonly evaluations: readonly RuleEvaluation[];

  readonly records: readonly TraceRecord[];

  readonly decisionTrace?: DecisionTrace;
}
