// src/nucleus/contracts/paymentContract.ts

/**
 * Payment Contract (v1)
 *
 * FIXED: see opportunityContract.ts's header -- same issue. Rewritten
 * to validate the real output of dualPayRuntime.ts's handlePayment()
 * (which nests DualPayEngine.react()'s result under a "payment" key,
 * unlike every other stage's flat spread -- that asymmetry is real,
 * not a typo, so this contract validates it as-is rather than papering
 * over it).
 *
 * This is the constitutional financial execution contract: DualPay is
 * the only subsystem that moves money.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface PaymentV1 {
  claimId: string;
  organizationId: string;
  claimPayload: Record<string, Dynamic>;
  execution: Dynamic;
  authorization: Dynamic;
  opportunity: Dynamic;
  recommendation: Dynamic;
  payment: {
    financialAction: "charge" | "hold" | "release" | "deny";
    amount: number;
    reason: string;
    timestamp: number;
  };
}

function invariant(payload: PaymentV1): boolean {
  if (!payload) return false;
  if (!payload.claimId || typeof payload.claimId !== "string") return false;
  if (!payload.organizationId || typeof payload.organizationId !== "string") return false;

  const p = payload.payment;
  if (!p || typeof p !== "object") return false;
  if (!["charge", "hold", "release", "deny"].includes(p.financialAction)) return false;
  if (typeof p.amount !== "number" || !Number.isFinite(p.amount) || p.amount < 0) return false;
  if (!p.reason || typeof p.reason !== "string") return false;
  if (typeof p.timestamp !== "number") return false;

  return true;
}

/**
 * Business rule: dualPayEngine.ts's react() only ever returns "deny"
 * with amount 0, and only ever returns "charge" with amount > 0.
 * Catches a future engine change that would deny a claim while still
 * moving money, or charge a claim for $0.
 */
function validate(payload: PaymentV1): ContractValidationResult {
  const errors: string[] = [];
  const { financialAction, amount } = payload.payment;

  if (financialAction === "deny" && amount !== 0) {
    errors.push('financialAction "deny" must have amount 0.');
  }
  if (financialAction === "charge" && !(amount > 0)) {
    errors.push('financialAction "charge" must have amount > 0.');
  }

  return { ok: errors.length === 0, errors: errors.length ? errors : undefined };
}

const compatibleWith = ["v1"];

const PaymentContractV1: ContractDefinition = {
  name: "payment",
  version: "v1",
  invariant,
  validate,
  compatibleWith,
};

registerContract(PaymentContractV1);

export { PaymentContractV1 };
