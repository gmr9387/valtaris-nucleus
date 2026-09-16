// src/nucleus/contracts/executionContract.ts

/**
 * Execution Contract (v1)
 *
 * FIXED: see opportunityContract.ts's header -- same issue. Rewritten
 * to validate the real output of glueRuntime.ts's handleExecution().
 *
 * This is the constitutional "DO" contract: Glue is the only subsystem
 * that turns an authorization into an execution status.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface ExecutionV1 {
  claimId: string;
  organizationId: string;
  claimPayload: Record<string, Dynamic>;
  authorization: Dynamic;
  opportunity: Dynamic;
  recommendation: Dynamic;
  status: "skipped" | "executed";
  reason: string;
  timestamp: number;
}

function invariant(payload: ExecutionV1): boolean {
  if (!payload) return false;
  if (!payload.claimId || typeof payload.claimId !== "string") return false;
  if (!payload.organizationId || typeof payload.organizationId !== "string") return false;
  if (payload.status !== "skipped" && payload.status !== "executed") return false;
  if (!payload.reason || typeof payload.reason !== "string") return false;
  if (typeof payload.timestamp !== "number") return false;
  if (typeof payload.authorization !== "object" || payload.authorization === null) return false;
  return true;
}

/**
 * Business rule: glueRuntime.ts's handleExecution() only ever sets
 * status "executed" when authorization.decision === "allow". Catches a
 * future Glue change that would execute against a denied authorization.
 */
function validate(payload: ExecutionV1): ContractValidationResult {
  const errors: string[] = [];

  if (payload.status === "executed" && payload.authorization?.decision !== "allow") {
    errors.push('status "executed" requires authorization.decision === "allow".');
  }

  return { ok: errors.length === 0, errors: errors.length ? errors : undefined };
}

const compatibleWith = ["v1"];

const ExecutionContractV1: ContractDefinition = {
  name: "execution",
  version: "v1",
  invariant,
  validate,
  compatibleWith,
};

registerContract(ExecutionContractV1);

export { ExecutionContractV1 };
