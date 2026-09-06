// services/decisions/decisionService.ts
// Decision Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusGovernance } from "../../src/nucleus/governance/governanceEngine";
import { nucleusCertification } from "../../src/nucleus/certification/certificationEngine";
import { nucleusMetrics } from "../../src/nucleus/metrics/metricsEngine";
import { nucleusTelemetry } from "../../src/nucleus/telemetry/telemetryEngine";
import { nucleusState } from "../../src/nucleus/state/stateEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";

export class DecisionService {
  async defineModel(org: string, name: string, rules: any[]) {
    const modelId = randomUUID();

    nucleusState.set(org, "decisions", `model.${modelId}`, {
      modelId,
      name,
      rules,
      createdAt: Date.now(),
    });

    nucleusAudit.log(org, "decisions", "model.define", "decision-service", {
      modelId,
      name,
    });

    return { modelId, name };
  }

  async evaluate(org: string, modelId: string, input: any) {
    const model = nucleusState.get(org, "decisions", `model.${modelId}`);
    if (!model) return { status: "not-found" };

    const governance = nucleusGovernance.evaluate(org, "decisions", model.name, input);
    const certification = nucleusCertification.verify(org, "decisions", input);

    const result = {
      modelId,
      governance,
      certification,
      input,
      decision: governance && certification,
    };

    nucleusMetrics.record(org, "decisions", "decision.evaluate", {
      modelId,
      decision: result.decision,
    });

    nucleusTelemetry.record(org, "decisions", "decision.evaluate", {
      modelId,
      input,
    });

    nucleusBilling.recordEvent(org, "decisions", "decision.evaluate", 1, 0.002, {
      modelId,
    });

    nucleusAudit.log(org, "decisions", "decision.evaluate", "decision-service", {
      modelId,
      decision: result.decision,
    });

    return result;
  }
}

export const valtarisDecisionService = new DecisionService();
