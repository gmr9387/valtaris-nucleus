// src/nucleus/contracts/recommendationContract.ts

/**
 * Recommendation Contract (v1)
 *
 * Purpose:
 *   Define the canonical shape, invariants, validation rules,
 *   and compatibility rules for recommendations emitted by Weaver.
 *
 * This is the SECOND contract in the Valtara Loop.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";

export interface RecommendationV1 {
  id: string; // recommendation id
  opportunityId: string; // must reference a valid opportunity
  source: string; // must be "weaver"
  timestamp: number;
  action: string; // e.g. "buy", "sell", "hold", "execute-workflow"
  confidence: number; // 0–1
  payload: Record<string, any>;
}

/**
 * Invariant:
 *   - id must exist
 *   - opportunityId must exist
 *   - timestamp must be a valid number
 *   - source must be "weaver"
 *   - action must be non-empty
 *   - confidence must be between 0 and 1
 *   - payload must be an object
 */
function invariant(payload: RecommendationV1): boolean {
  if (!payload) return false;
  if (!payload.id) return false;
  if (!payload.opportunityId) return false;
  if (typeof payload.timestamp !== "number") return false;
  if (payload.source !== "weaver") return false;
  if (!payload.action || typeof payload.action !== "string") return false;
  if (typeof payload.confidence !== "number") return false;
  if (payload.confidence < 0 || payload.confidence > 1) return false;
  if (typeof payload.payload !== "object") return false;
  return true;
}

/**
 * Validation:
 *   - domain-specific checks based on action type
 */
function validate(payload: RecommendationV1): ContractValidationResult {
  const errors: string[] = [];

  if (!payload.payload) {
    errors.push("Missing payload object.");
  }

  if (payload.action === "buy" || payload.action === "sell") {
    if (!payload.payload.symbol) {
      errors.push(`${payload.action} requires payload.symbol`);
    }
    if (!payload.payload.amount) {
      errors.push(`${payload.action} requires payload.amount`);
    }
  }

  if (payload.action === "execute-workflow") {
    if (!payload.payload.workflowName) {
      errors.push("execute-workflow requires payload.workflowName");
    }
  }

  return {
    ok: errors.length === 0,
    errors: errors.length ? errors : undefined,
  };
}

/**
 * Compatibility:
 *   v1 is only compatible with itself for now.
 */
const compatibleWith = ["v1"];

/**
 * Contract Definition
 */
const RecommendationContractV1: ContractDefinition = {
  name: "recommendation",
  version: "v1",
  validate,
  invariant,
  compatibleWith,
};

/**
 * Register the contract with Nucleus.
 */
registerContract(RecommendationContractV1);

export { RecommendationContractV1 };
