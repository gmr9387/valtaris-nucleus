// src/nucleus/subsystems/weaver/weaverRuntime.ts

import { eventBus } from "../../events/eventBus";
import { recordTelemetry } from "../../telemetry/telemetry";
import { listWeaverRules } from "@/lib/weaver-rules";
import { evaluateRules } from "@/engine/weaver-rule-evaluator";
import type { Dynamic } from "../../types/dynamic";

// Recommendation stays "review" (never auto-executes) below this
// confidence. Kept as a constant rather than a persisted setting for
// now -- the *factors* feeding confidence are what nucleus's ecosystem
// role needs configurable (see weaver_rules), this threshold is a
// separate, coarser policy question.
const AUTO_APPROVE_THRESHOLD = 0.55;

export class WeaverRuntime {
  static async handle(contractName: string, payload: Dynamic) {
    switch (contractName) {
      case "opportunity":
        return this.handleOpportunity(payload);

      case "recommendation":
        return this.handleRecommendation(payload);

      default:
        throw new Error(`Weaver cannot handle contract: ${contractName}`);
    }
  }

  /**
   * FIXED: score was a single hardcoded formula (amount/20, clamped).
   * That intrinsic claim-value signal is real and stays as the base --
   * but it's now extensible via weaver_rules (@/lib/weaver-rules.ts):
   * real, persisted, editable scoring factors (e.g. "high-cost
   * procedure bonus", "known-risky payer penalty") layer on top instead
   * of requiring a code change per new business rule. This is nucleus
   * acting as the ecosystem's decisioning "arm" for real, borrowing the
   * sibling Decision Weaver product's rules/weights design natively
   * rather than depending on that separate, uncredentialed service.
   *
   * Rule-fetch failure fails safe to the base score alone (same
   * behavior as before weaver_rules existed) rather than blocking the
   * claim -- Weaver is an advisory signal, not an authorization gate.
   */
  private static async handleOpportunity(payload: Dynamic) {
    // A negative claimPayload.amount previously produced a negative
    // score (e.g. amount -500 -> score -25), and a non-numeric amount
    // (wrong type from a caller) produced NaN silently instead of
    // failing safe. Coerce and clamp so the base score always lands in
    // [0, 100] before any rule adjustment is added.
    const amount = Number(payload.claimPayload?.amount);
    const baseScore = Number.isFinite(amount) && amount > 0 ? Math.min(amount / 20, 100) : 0;

    let ruleAdjustment = 0;
    let firedRules: string[] = [];
    try {
      const rules = await listWeaverRules("opportunity", payload.organizationId ?? null);
      const evaluation = evaluateRules(rules, payload);
      ruleAdjustment = evaluation.totalWeight;
      firedRules = evaluation.firedRules;
    } catch (err) {
      console.error(
        "[weaver] opportunity rule evaluation failed, using base score only:",
        (err as Error).message,
      );
    }

    const score = Math.max(0, Math.min(baseScore + ruleAdjustment, 100));

    const result = {
      ...payload,
      score,
      firedRules,
    };

    eventBus.emit("weaver.opportunity.processed", result);

    recordTelemetry("weaver", "opportunity", result.claimId, result.organizationId, result);

    return result;
  }

  /**
   * FIXED: action/confidence were originally hardcoded constants
   * ("approve"/0.7); a later pass made confidence a fixed-weight sum of
   * three boolean checks (procedure code / diagnosis codes / positive
   * amount) baked into this file as literal +0.3/+0.15/+0.15 additions.
   * Those exact weights now live as real, persisted weaver_rules rows
   * (seeded by the migration to reproduce this file's prior behavior
   * exactly) instead of an if-chain, so new scoring factors (payer risk
   * tier, claim type, org history) can be added as data, not code.
   * Rule-fetch failure fails safe to the 0.4 baseline alone (same
   * confidence floor as before), which still routes to "review" rather
   * than "approve" -- i.e. failure degrades toward caution, not toward
   * auto-executing on an unverified signal.
   */
  private static async handleRecommendation(payload: Dynamic) {
    const baseline = 0.4; // only claimId/organizationId are guaranteed present

    let ruleAdjustment = 0;
    let firedRules: string[] = [];
    try {
      const rules = await listWeaverRules("recommendation", payload.organizationId ?? null);
      const evaluation = evaluateRules(rules, payload);
      ruleAdjustment = evaluation.totalWeight;
      firedRules = evaluation.firedRules;
    } catch (err) {
      console.error(
        "[weaver] recommendation rule evaluation failed, using baseline confidence only:",
        (err as Error).message,
      );
    }

    const confidence = Math.round(Math.max(0, Math.min(baseline + ruleAdjustment, 1)) * 100) / 100;
    const action = confidence >= AUTO_APPROVE_THRESHOLD ? "approve" : "review";

    const result = {
      ...payload,
      action,
      confidence,
      firedRules,
    };

    eventBus.emit("weaver.recommendation.processed", result);

    recordTelemetry("weaver", "recommendation", result.claimId, result.organizationId, result);

    return result;
  }
}
