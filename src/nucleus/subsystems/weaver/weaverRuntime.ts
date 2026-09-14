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
    // FIXED: action/confidence were hardcoded constants ("approve"/0.7)
    // regardless of input -- glueRuntime.ts's execution gate used to
    // check them and could never fail, which looked like a real
    // secondary safety check while providing zero actual signal (see
    // the FIXED note there). No denial/payer risk history is available
    // this early in the pipeline, so this isn't a risk model -- it's an
    // honest measure of how much of the real claim data Weaver actually
    // has to work with: a real procedure code, real diagnosis codes,
    // and a real positive amount, rather than the placeholders
    // Guardian falls back to later when they're missing.
    const claimPayload = payload.claimPayload ?? {};
    const hasProcedureCode =
      typeof claimPayload.procedure_code === "string" && claimPayload.procedure_code.trim() !== "";
    const hasDiagnosisCodes =
      Array.isArray(claimPayload.diagnosis_codes) && claimPayload.diagnosis_codes.length > 0;
    const amount = Number(claimPayload.amount);
    const hasPositiveAmount = Number.isFinite(amount) && amount > 0;

    let confidence = 0.4; // baseline: only claimId/organizationId are guaranteed present
    if (hasProcedureCode) confidence += 0.3;
    if (hasDiagnosisCodes) confidence += 0.15;
    if (hasPositiveAmount) confidence += 0.15;
    confidence = Math.round(confidence * 100) / 100;

    const action = confidence >= 0.55 ? "approve" : "review";

    const result = {
      ...payload,
      action,
      confidence,
    };

    eventBus.emit("weaver.recommendation.processed", result);

    recordTelemetry("weaver", "recommendation", result.claimId, result.organizationId, result);

    return result;
  }
}
