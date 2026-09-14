// src/nucleus/contracts/authorizationContract.ts

/**
 * Authorization Contract (v1)
 *
 * Purpose:
 *   Define the canonical shape, invariants, validation rules,
 *   and compatibility rules for authorizations emitted by Guardian.
 *
 * This is the THIRD contract in the Valtara Loop.
 * It is the constitutional enforcement point.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface AuthorizationV1 {
  id: string; // authorization id
  recommendationId: string; // must reference a valid recommendation
  opportunityId: string; // must reference a valid opportunity
  source: string; // must be "guardian"
  timestamp: number;

  decision: "approved" | "rejected";
  reason?: string;

  // Guardian-specific scoring + risk metadata
  riskScore: number; // 0–1
  confidence: number; // 0–1

  payload: Record<string, Dynamic>;
}

/**
 * Invariant:
 *   - id must exist
 *   - recommendationId must exist
 *   - opportunityId must exist
 *   - timestamp must be a valid number
 *   - source must be "guardian"
 *   - decision must be approved/rejected
 *   - riskScore must be between 0 and 1
 *   - confidence must be between 0 and 1
 *   - payload must be an object
 */
function invariant(payload: AuthorizationV1): boolean {
  if (!payload) return false;
  if (!payload.id) return false;
  if (!payload.recommendationId) return false;
  if (!payload.opportunityId) return false;
  if (typeof payload.timestamp !== "number") return false;
  if (payload.source !== "guardian") return false;
  if (!["approved", "rejected"].includes(payload.decision)) return false;
  if (typeof payload.riskScore !== "number") return false;
  if (payload.riskScore < 0 || payload.riskScore > 1) return false;
  if (typeof payload.confidence !== "number") return false;
  if (payload.confidence < 0 || payload.confidence > 1) return false;
  if (typeof payload.payload !== "object") return false;
  return true;
}

/**
 * Validation:
 *   - approved requires execution metadata
 *   - rejected requires a reason
 */
function validate(payload: AuthorizationV1): ContractValidationResult {
  const errors: string[] = [];

  if (payload.decision === "approved") {
    if (!payload.payload.executionType) {
      errors.push("approved requires payload.executionType");
    }
    if (!payload.payload.executionPayload) {
      errors.push("approved requires payload.executionPayload");
    }
  }

  if (payload.decision === "rejected") {
    if (!payload.reason) {
      errors.push("rejected requires reason");
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
const AuthorizationContractV1: ContractDefinition = {
  name: "authorization",
  version: "v1",
  validate,
  invariant,
  compatibleWith,
};

/**
 * Register the contract with Nucleus.
 */
registerContract(AuthorizationContractV1);

export { AuthorizationContractV1 };
