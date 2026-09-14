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

      const finalConfidence = this.confidence.score([base.confidence]);

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
