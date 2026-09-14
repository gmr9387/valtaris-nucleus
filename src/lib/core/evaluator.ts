/**
 * ValtariOS Core — Rule Evaluator
 *
 * Responsibilities (future home; no logic moved yet):
 *  - Rule execution against incoming facts
 *  - Condition evaluation and short-circuiting
 *  - Rule firing and weight assignment
 *  - Decision candidate generation
 *
 * Status: Architecture Ready. Placeholder only.
 */

import type { CoreEvaluationRequest } from "./contracts";
import type { DecisionCandidate, RuleEvaluation } from "./types";

export interface EvaluatorOutput {
  readonly evaluations: readonly RuleEvaluation[];
  readonly candidates: readonly DecisionCandidate[];
}

export function evaluateRules(_request: CoreEvaluationRequest): EvaluatorOutput {
  // Intentionally not implemented in Phase 1.
  // Extraction of live rule execution will happen in a later phase.
  return { evaluations: [], candidates: [] };
}
