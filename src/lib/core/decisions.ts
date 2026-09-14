/**
 * ValtariOS Core — Decision Resolution
 *
 * Responsibilities (future home; no logic moved yet):
 *  - Candidate vote aggregation
 *  - Priority weighting
 *  - Tie breaking
 *  - Final decision selection and rationale assembly
 *
 * Status: Architecture Ready. Placeholder only.
 */

import type { DecisionResult } from "./contracts";
import type { DecisionCandidate } from "./types";

export function resolveDecision(_candidates: readonly DecisionCandidate[]): DecisionResult {
  return {
    decision: {
      id: "",

      outcome: "unresolved",

      confidence: 0,

      confidenceBand: "low",

      severity: "info",

      rationale: "Phase 1 placeholder — extraction pending.",

      createdAt: new Date(0).toISOString(),
    },

    candidates: [],
  };
}
