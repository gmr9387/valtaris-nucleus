// src/nucleus/contracts/authorizationContract.ts

/**
 * Authorization Contract (v1)
 *
 * FIXED: see opportunityContract.ts's header -- same issue. Rewritten
 * to validate the real output of guardianRuntime.ts's handleAuthorization(),
 * which has two shapes: the fail-closed early return (accumulator fetch
 * threw -- decision/reason/timestamp only) and the normal path (adds a
 * real adjudication result plus data-provenance flags). adjudication is
 * therefore optional at the shape level, but see validate() below for
 * the real constitutional check.
 *
 * This is the constitutional enforcement point: Guardian is the only
 * subsystem that decides allow/deny.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface AuthorizationV1 {
  claimId: string;
  organizationId: string;
  claimPayload: Record<string, Dynamic>;
  opportunity: Dynamic;
  recommendation: Dynamic;
  decision: "allow" | "deny";
  reason: string;
  timestamp: number;
  adjudication?: {
    status: string;
    allowed: number;
    plan_paid: number;
    member_responsibility: number;
    deductible_applied: number;
    coinsurance: number;
  };
}

function invariant(payload: AuthorizationV1): boolean {
  if (!payload) return false;
  if (!payload.claimId || typeof payload.claimId !== "string") return false;
  if (!payload.organizationId || typeof payload.organizationId !== "string") return false;
  if (payload.decision !== "allow" && payload.decision !== "deny") return false;
  if (!payload.reason || typeof payload.reason !== "string") return false;
  if (typeof payload.timestamp !== "number") return false;
  return true;
}

/**
 * Business rule, not just shape: guardianRuntime.ts's only path that
 * returns decision "allow" always attaches a real adjudication result;
 * the only path that omits adjudication is the fail-closed catch
 * branch, which always denies. dualPayEngine.ts independently relies on
 * this same assumption -- an "allow" with no adjudication data falls
 * back to a "hold" rather than a real charge. This check catches a
 * future Guardian change that breaks that assumption before it ever
 * reaches DualPay.
 */
function validate(payload: AuthorizationV1): ContractValidationResult {
  const errors: string[] = [];

  if (payload.decision === "allow") {
    const a = payload.adjudication;
    if (!a || typeof a !== "object") {
      errors.push('decision "allow" requires an adjudication result.');
    } else {
      if (typeof a.allowed !== "number") errors.push("adjudication.allowed must be a number.");
      if (typeof a.plan_paid !== "number") errors.push("adjudication.plan_paid must be a number.");
      if (typeof a.member_responsibility !== "number") {
        errors.push("adjudication.member_responsibility must be a number.");
      }
    }
  }

  return { ok: errors.length === 0, errors: errors.length ? errors : undefined };
}

const compatibleWith = ["v1"];

const AuthorizationContractV1: ContractDefinition = {
  name: "authorization",
  version: "v1",
  invariant,
  validate,
  compatibleWith,
};

registerContract(AuthorizationContractV1);

export { AuthorizationContractV1 };
