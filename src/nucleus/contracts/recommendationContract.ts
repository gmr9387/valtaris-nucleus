// src/nucleus/contracts/recommendationContract.ts

/**
 * Recommendation Contract (v1)
 *
 * FIXED: see opportunityContract.ts's header -- same issue (validated a
 * fictional shape, was never imported so never registered). Rewritten
 * to validate the real output of weaverRuntime.ts's handleRecommendation().
 *
 * Purpose:
 *   Validate the shape Weaver actually emits for the "recommendation"
 *   stage of a claim run.
 */

import { registerContract, ContractDefinition } from "./contractRegistry";
import type { Dynamic } from "../types/dynamic";

export interface RecommendationV1 {
  claimId: string;
  organizationId: string;
  claimPayload: Record<string, Dynamic>;
  opportunity: Dynamic; // OpportunityV1 from the prior stage
  action: "approve" | "review";
  confidence: number; // 0-1
}

function invariant(payload: RecommendationV1): boolean {
  if (!payload) return false;
  if (!payload.claimId || typeof payload.claimId !== "string") return false;
  if (!payload.organizationId || typeof payload.organizationId !== "string") return false;
  if (typeof payload.claimPayload !== "object" || payload.claimPayload === null) return false;
  if (typeof payload.opportunity !== "object" || payload.opportunity === null) return false;
  if (payload.action !== "approve" && payload.action !== "review") return false;
  if (typeof payload.confidence !== "number" || !Number.isFinite(payload.confidence)) return false;
  if (payload.confidence < 0 || payload.confidence > 1) return false;
  return true;
}

const compatibleWith = ["v1"];

const RecommendationContractV1: ContractDefinition = {
  name: "recommendation",
  version: "v1",
  invariant,
  compatibleWith,
};

registerContract(RecommendationContractV1);

export { RecommendationContractV1 };
