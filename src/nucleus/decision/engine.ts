// src/nucleus/decision/engine.ts
// Corrected Full File — Unified Decision Engine

import { Executor } from "./executor";
import { Governance } from "./governance";
import { Confidence } from "./confidence";
import { Replay } from "./replay";
import { NucleusTelemetryAdapter } from "../telemetry/nucleusTelemetryAdapter";
import type { Dynamic } from "../types/dynamic";

export class DecisionEngine {
  private executor: Executor;
  private governance: Governance;
  private confidence: Confidence;
  private replay: Replay;
  private telemetry: NucleusTelemetryAdapter;

  constructor(
    private organizationId: string,
    private subsystem: string,
  ) {
    this.executor = new Executor();
    this.governance = new Governance();
    this.confidence = new Confidence();
    this.replay = new Replay();
    this.telemetry = new NucleusTelemetryAdapter(organizationId, subsystem);
    this.registerDefaultGovernanceRules();
  }

  /**
   * FIXED: Governance previously had zero rules registered by any real
   * caller, so evaluate() always fell through its `for` loop to the
   * default "allow" -- governance existed but never actually governed
   * anything. These two rules make the engine's own authorization
   * decision agree with Guardian's real, authoritative signals (rather
   * than silently ignoring them), giving every evaluation an explicit,
   * named rule trail instead of an implicit always-allow.
   */
  private registerDefaultGovernanceRules() {
    this.governance.addRule({
      id: "guardian-risk-critical",
      name: "Deny when Guardian's risk tier is critical",
      condition: (ctx: Dynamic) => ctx?.authorization?.risk_tier === "critical",
      effect: "deny",
    });
    this.governance.addRule({
      id: "guardian-denied",
      name: "Deny when Guardian's own authorization decision is deny",
      condition: (ctx: Dynamic) => ctx?.authorization?.decision === "deny",
      effect: "deny",
    });
  }

  // -----------------------------
  // Add Governance Rule
  // -----------------------------
  addRule(rule: {
    id: string;
    name: string;
    condition: (ctx: Dynamic) => boolean;
    effect: "allow" | "deny";
  }) {
    this.governance.addRule(rule);
    this.telemetry.debug("Decision rule added", { rule });
  }

  // -----------------------------
  // Evaluate Decision
  // -----------------------------
  evaluate(context: Dynamic) {
    const span = this.telemetry.startSpan("decision:evaluate");

    try {
      const governanceDecision = this.governance.evaluate(context);

      const base = this.executor.execute({
        organizationId: this.organizationId,
        subsystem: this.subsystem,
        context,
      });

      const finalAllowed = governanceDecision === "allow" && base.allowed;

      // FIXED: this used to be this.confidence.score([base.confidence]) --
      // averaging a single already-computed value, a no-op wrapper around
      // Executor's own number. Confidence.score() now actually blends
      // multiple real signals: the executor's own confidence plus Weaver's
      // two real numeric scores directly from context, when present.
      const weaverCtx = (context ?? {}) as {
        opportunity?: { score?: number };
        recommendation?: { confidence?: number };
      };
      const rawSignals = [
        base.confidence,
        typeof weaverCtx.opportunity?.score === "number"
          ? weaverCtx.opportunity.score / 100
          : undefined,
        typeof weaverCtx.recommendation?.confidence === "number"
          ? weaverCtx.recommendation.confidence
          : undefined,
      ].filter((v): v is number => typeof v === "number");

      const finalConfidence = this.confidence.score(rawSignals);

      this.replay.record(this.subsystem, "decision", {
        context,
        governanceDecision,
        finalAllowed,
        finalConfidence,
      });

      this.telemetry.info("Decision evaluated", {
        governanceDecision,
        finalAllowed,
        finalConfidence,
      });

      return {
        allowed: finalAllowed,
        confidence: finalConfidence,
        reasons: base.reasons,
      };
    } catch (err) {
      this.telemetry.error("Decision evaluation failed", { error: err });
      throw err;
    } finally {
      this.telemetry.endSpan(span.spanId);
    }
  }

  // -----------------------------
  // Replay History
  // -----------------------------
  getReplay() {
    return this.replay.replay();
  }
}
