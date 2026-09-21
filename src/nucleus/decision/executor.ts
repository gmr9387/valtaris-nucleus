// src/nucleus/decision/executor.ts

import type { Dynamic } from "../types/dynamic";
export type DecisionInput = {
  organizationId: string;
  subsystem: string;
  context: Dynamic;
};

export type DecisionResult = {
  allowed: boolean;
  confidence: number;
  reasons: string[];
};

/** The shape of `context` when the decision engine is evaluated on a real
 * OSPipeline claim (see osPipeline.ts): Guardian's real authorization
 * signal plus Weaver's two real scoring signals. Other callers (the CLI's
 * `nucleus decision context.json`, for one) can pass any JSON; missing
 * fields degrade to "no signal" rather than a hardcoded confidence. */
type ClaimDecisionContext = {
  authorization?: { decision?: "allow" | "deny"; risk_tier?: string; reason?: string };
  recommendation?: { confidence?: number };
  opportunity?: { score?: number };
};

/**
 * FIXED: this used to return a constant {allowed: true, confidence: 0.9}
 * for every input, completely ignoring `context` -- confirmed by reading
 * this file, not trusting the "governance + confidence refine this"
 * comment that implied otherwise. There was nothing to refine: Governance
 * had no rules registered anywhere, and Confidence.score([0.9]) is a
 * no-op average of one element.
 *
 * Real authorization/risk decisions for an actual claim are made
 * authoritatively by GuardianRuntime, not here -- this executor does not
 * re-derive or override that. What it does for real: reflects Guardian's
 * actual decision/risk_tier into `allowed`/`reasons` (so a caller of the
 * decision engine alone, like the CLI, gets a real answer instead of a
 * constant), and derives `confidence` from Weaver's two real numeric
 * signals (opportunity.score, recommendation.confidence) when present.
 */
export class Executor {
  execute(input: DecisionInput): DecisionResult {
    const ctx = (input.context ?? {}) as ClaimDecisionContext;
    const reasons: string[] = [];

    const deniedByGuardian = ctx.authorization?.decision === "deny";
    const criticalRisk = ctx.authorization?.risk_tier === "critical";

    if (deniedByGuardian) {
      reasons.push(`guardian denied: ${ctx.authorization?.reason ?? "no reason given"}`);
    }
    if (criticalRisk) {
      reasons.push(
        `guardian risk tier critical: ${ctx.authorization?.reason ?? "no reason given"}`,
      );
    }

    const allowed = !deniedByGuardian && !criticalRisk;

    const opportunitySignal =
      typeof ctx.opportunity?.score === "number"
        ? Math.max(0, Math.min(ctx.opportunity.score / 100, 1))
        : undefined;
    const recommendationSignal =
      typeof ctx.recommendation?.confidence === "number"
        ? ctx.recommendation.confidence
        : undefined;
    const signals = [opportunitySignal, recommendationSignal].filter(
      (v): v is number => typeof v === "number",
    );

    if (signals.length === 0) reasons.push("no weaver signals present in context");
    if (reasons.length === 0) reasons.push("no denial signals present");

    return {
      allowed,
      confidence: signals.length ? signals.reduce((a, b) => a + b, 0) / signals.length : 0,
      reasons,
    };
  }
}
