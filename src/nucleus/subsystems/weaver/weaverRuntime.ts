// src/nucleus/subsystems/weaver/weaverRuntime.ts

import { eventBus } from "../../events/eventBus";
import { recordTelemetry } from "../../telemetry/telemetry";

export class WeaverRuntime {
  static handle(contractName: string, payload: any) {
    switch (contractName) {
      case "opportunity":
        return this.handleOpportunity(payload);

      case "recommendation":
        return this.handleRecommendation(payload);

      default:
        throw new Error(`Weaver cannot handle contract: ${contractName}`);
    }
  }

  private static handleOpportunity(payload: any) {
    const result = {
      ...payload,
      score: payload.claimPayload?.amount ? Math.min(payload.claimPayload.amount / 20, 100) : 0,
    };

    eventBus.emit("weaver.opportunity.processed", result);

    recordTelemetry("weaver", "opportunity", result.claimId, result.organizationId, result);

    return result;
  }

  private static handleRecommendation(payload: any) {
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
