// src/nucleus/contracts/opportunityContract.ts

/**
 * Opportunity Contract (v1)
 *
 * Purpose:
 *   Define the canonical shape, invariants, validation rules,
 *   and compatibility rules for opportunities emitted by Weaver.
 *
 * This is the FIRST contract in the Valtara Loop.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";

export interface OpportunityV1 {
  id: string;
  source: string; // e.g. "weaver"
  timestamp: number;
  type: string; // e.g. "market-signal", "pattern-detection", "anomaly"
  payload: Record<string, any>;
}

/**
 * Invariant:
 *   - id must exist
 *   - timestamp must be a valid number
 *   - source must be "weaver"
 *   - type must be non-empty
 *   - payload must be an object
 */
function invariant(payload: OpportunityV1): boolean {
  if (!payload) return false;
  if (!payload.id) return false;
  if (typeof payload.timestamp !== "number") return false;
  if (payload.source !== "weaver") return false;
  if (!payload.type || typeof payload.type !== "string") return false;
  if (typeof payload.payload !== "object") return false;
  return true;
}

/**
 * Validation:
 *   - payload must contain domain-specific fields depending on type
 *   - this is intentionally minimal for v1
 */
function validate(payload: OpportunityV1): ContractValidationResult {
  const errors: string[] = [];

  if (!payload.payload) {
    errors.push("Missing payload object.");
  }

  if (payload.type === "market-signal") {
    if (!payload.payload.symbol) {
      errors.push("market-signal requires payload.symbol");
    }
    if (!payload.payload.signal) {
      errors.push("market-signal requires payload.signal");
    }
  }

  if (payload.type === "pattern-detection") {
    if (!payload.payload.pattern) {
      errors.push("pattern-detection requires payload.pattern");
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
const OpportunityContractV1: ContractDefinition = {
  name: "opportunity",
  version: "v1",
  validate,
  invariant,
  compatibleWith,
};

/**
 * Register the contract with Nucleus.
 */
registerContract(OpportunityContractV1);

export { OpportunityContractV1 };
