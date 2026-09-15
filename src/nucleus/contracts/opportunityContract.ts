// src/nucleus/contracts/opportunityContract.ts

/**
 * Opportunity Contract (v1)
 *
 * FIXED: this validated a shape ({id, source, timestamp, type, payload})
 * that has no relationship to what WeaverRuntime.handleOpportunity()
 * actually produces -- it was written for a generic market-signal/
 * pattern-detection model that was never reconciled with the real
 * claims pipeline. Nothing imported this file either, so
 * registerContract() never ran and getContract("opportunity", "v1")
 * always returned undefined. Rewritten to validate the real output
 * shape and wired into OSPipeline.dispatch() (via contracts/index.ts's
 * barrel import), so this is now genuine enforcement on every claim.
 *
 * Purpose:
 *   Validate the shape Weaver actually emits for the "opportunity"
 *   stage of a claim run (see weaverRuntime.ts's handleOpportunity()).
 */

import { registerContract, ContractDefinition } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface OpportunityV1 {
  claimId: string;
  organizationId: string;
  claimPayload: Record<string, Dynamic>;
  score: number; // 0-100, clamped by WeaverRuntime
}

function invariant(payload: OpportunityV1): boolean {
  if (!payload) return false;
  if (!payload.claimId || typeof payload.claimId !== "string") return false;
  if (!payload.organizationId || typeof payload.organizationId !== "string") return false;
  if (typeof payload.claimPayload !== "object" || payload.claimPayload === null) return false;
  if (typeof payload.score !== "number" || !Number.isFinite(payload.score)) return false;
  if (payload.score < 0 || payload.score > 100) return false;
  return true;
}

const compatibleWith = ["v1"];

const OpportunityContractV1: ContractDefinition = {
  name: "opportunity",
  version: "v1",
  invariant,
  compatibleWith,
};

registerContract(OpportunityContractV1);

export { OpportunityContractV1 };
