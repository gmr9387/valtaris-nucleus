// src/nucleus/subsystems/weaver/weaverRuntime.ts

import { eventBus } from "../../events/eventBus";
import { recordTelemetry } from "../../telemetry/telemetry";
import type { Dynamic } from "../../types/dynamic";

export class WeaverRuntime {
  static handle(contractName: string, payload: Dynamic) {
    switch (contractName) {
      case "opportunity":
        return this.handleOpportunity(payload);

      case "recommendation":
        return this.handleRecommendation(payload);

      default:
        throw new Error(`Weaver cannot handle contract: ${contractName}`);
    }
  }

  private static handleOpportunity(payload: Dynamic) {
    // FIXED: a negative claimPayload.amount previously produced a
    // negative score (e.g. amount -500 -> score -25), and a non-numeric
    // amount (wrong type from a caller) produced NaN silently instead of
    // failing safe. Coerce and clamp so score always lands in [0, 100].
    const amount = Number(payload.claimPayload?.amount);
    const score = Number.isFinite(amount) && amount > 0 ? Math.min(amount / 20, 100) : 0;

    const result = {
      ...payload,
      score,
    };

    eventBus.emit("weaver.opportunity.processed", result);

    recordTelemetry("weaver", "opportunity", result.claimId, result.organizationId, result);

    return result;
  }

  private static handleRecommendation(payload: Dynamic) {
    const result = {
      ...payload,
      action: "approve",
      confidence: 0.7,
    };

    eventBus.emit("weaver.recommendation.processed", result);

    recordTelemetry("weaver", "recommendation", result.claimId, result.organizationId, result);

    return result;
  }
}
