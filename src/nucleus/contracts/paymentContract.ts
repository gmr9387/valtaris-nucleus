// src/nucleus/contracts/paymentContract.ts

/**
 * Payment Contract (v1)
 *
 * Purpose:
 *   Define the canonical shape, invariants, validation rules,
 *   and compatibility rules for payments executed by DualPay.
 *
 * This is the FIFTH and FINAL contract in the Valtara Loop.
 * It is the constitutional financial execution contract.
 */

import { registerContract, ContractDefinition, ContractValidationResult } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface PaymentV1 {
  id: string; // payment id
  executionId: string; // must reference a valid execution
  authorizationId: string; // must reference a valid authorization
  opportunityId: string; // must reference a valid opportunity
  recommendationId: string; // must reference a valid recommendation

  source: string; // must be "dualpay"
  timestamp: number;

  amount: number;
  currency: string; // e.g. "USD"
  destination: string; // account, wallet, routing target
  method: string; // e.g. "ach", "wire", "card", "rtp"

  status: "pending" | "processing" | "completed" | "failed";

  payload: Record<string, Dynamic>;
}

/**
 * Invariant:
 *   - id must exist
 *   - executionId must exist
 *   - authorizationId must exist
 *   - opportunityId must exist
 *   - recommendationId must exist
 *   - timestamp must be a valid number
 *   - source must be "dualpay"
 *   - amount must be > 0
 *   - currency must be non-empty
 *   - destination must be non-empty
 *   - method must be non-empty
 *   - status must be valid
 *   - payload must be an object
 */
function invariant(payload: PaymentV1): boolean {
  if (!payload) return false;
  if (!payload.id) return false;
  if (!payload.executionId) return false;
  if (!payload.authorizationId) return false;
  if (!payload.opportunityId) return false;
  if (!payload.recommendationId) return false;
  if (typeof payload.timestamp !== "number") return false;
  if (payload.source !== "dualpay") return false;
  if (typeof payload.amount !== "number" || payload.amount <= 0) return false;
  if (!payload.currency || typeof payload.currency !== "string") return false;
  if (!payload.destination || typeof payload.destination !== "string") return false;
  if (!payload.method || typeof payload.method !== "string") return false;
  if (!["pending", "processing", "completed", "failed"].includes(payload.status)) return false;
  if (typeof payload.payload !== "object") return false;
  return true;
}

/**
 * Validation:
 *   - ACH requires routing + account
 *   - wire requires swift + account
 *   - card requires cardToken
 *   - RTP requires rtpHandle
 */
function validate(payload: PaymentV1): ContractValidationResult {
  const errors: string[] = [];

  if (!payload.payload) {
    errors.push("Missing payload object.");
  }

  if (payload.method === "ach") {
    if (!payload.payload.routingNumber) {
      errors.push("ACH requires payload.routingNumber");
    }
    if (!payload.payload.accountNumber) {
      errors.push("ACH requires payload.accountNumber");
    }
  }

  if (payload.method === "wire") {
    if (!payload.payload.swiftCode) {
      errors.push("wire requires payload.swiftCode");
    }
    if (!payload.payload.accountNumber) {
      errors.push("wire requires payload.accountNumber");
    }
  }

  if (payload.method === "card") {
    if (!payload.payload.cardToken) {
      errors.push("card requires payload.cardToken");
    }
  }

  if (payload.method === "rtp") {
    if (!payload.payload.rtpHandle) {
      errors.push("rtp requires payload.rtpHandle");
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
const PaymentContractV1: ContractDefinition = {
  name: "payment",
  version: "v1",
  validate,
  invariant,
  compatibleWith,
};

/**
 * Register the contract with Nucleus.
 */
registerContract(PaymentContractV1);

export { PaymentContractV1 };
