// src/nucleus/contracts/executionContract.ts

/**
 * Execution Contract (v1)
 *
 * Purpose:
 *   Define the canonical shape, invariants, validation rules,
 *   and compatibility rules for executions performed by Glue.
 *
 * This is the FOURTH contract in the Valtara Loop.
 * It is the constitutional "DO" contract.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface ExecutionV1 {
  id: string; // execution id
  authorizationId: string; // must reference a valid authorization
  opportunityId: string; // must reference a valid opportunity
  recommendationId: string; // must reference a valid recommendation

  source: string; // must be "glue"
  timestamp: number;

  executionType: string; // e.g. "workflow", "trade", "payment"
  status: "pending" | "in-progress" | "completed" | "failed";

  payload: Record<string, Dynamic>;
}

/**
 * Invariant:
 *   - id must exist
 *   - authorizationId must exist
 *   - opportunityId must exist
 *   - recommendationId must exist
 *   - timestamp must be a valid number
 *   - source must be "glue"
 *   - executionType must be non-empty
 *   - status must be valid
 *   - payload must be an object
 */
function invariant(payload: ExecutionV1): boolean {
  if (!payload) return false;
  if (!payload.id) return false;
  if (!payload.authorizationId) return false;
  if (!payload.opportunityId) return false;
  if (!payload.recommendationId) return false;
  if (typeof payload.timestamp !== "number") return false;
  if (payload.source !== "glue") return false;
  if (!payload.executionType || typeof payload.executionType !== "string") return false;
  if (!["pending", "in-progress", "completed", "failed"].includes(payload.status)) return false;
  if (typeof payload.payload !== "object") return false;
  return true;
}

/**
 * Validation:
 *   - workflow execution requires workflowName
 *   - trade execution requires symbol + amount
 *   - payment execution requires amount + currency + destination
 */
function validate(payload: ExecutionV1): ContractValidationResult {
  const errors: string[] = [];

  if (!payload.payload) {
    errors.push("Missing payload object.");
  }

  if (payload.executionType === "workflow") {
    if (!payload.payload.workflowName) {
      errors.push("workflow execution requires payload.workflowName");
    }
  }

  if (payload.executionType === "trade") {
    if (!payload.payload.symbol) {
      errors.push("trade execution requires payload.symbol");
    }
    if (!payload.payload.amount) {
      errors.push("trade execution requires payload.amount");
    }
  }

  if (payload.executionType === "payment") {
    if (!payload.payload.amount) {
      errors.push("payment execution requires payload.amount");
    }
    if (!payload.payload.currency) {
      errors.push("payment execution requires payload.currency");
    }
    if (!payload.payload.destination) {
      errors.push("payment execution requires payload.destination");
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
const ExecutionContractV1: ContractDefinition = {
  name: "execution",
  version: "v1",
  validate,
  invariant,
  compatibleWith,
};

/**
 * Register the contract with Nucleus.
 */
registerContract(ExecutionContractV1);

export { ExecutionContractV1 };
