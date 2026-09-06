// services/governance/governanceService.ts
// Governance Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusGovernance } from "../../src/nucleus/governance/governanceEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";
import { nucleusState } from "../../src/nucleus/state/stateEngine";

export class GovernanceService {
  async defineRule(org: string, subsystem: string, name: string, conditions: any) {
    const ruleId = randomUUID();

    nucleusState.set(org, "governance", `rule.${ruleId}`, {
      ruleId,
      subsystem,
      name,
      conditions,
      createdAt: Date.now(),
    });

    nucleusAudit.log(org, "governance", "rule.define", "governance-service", {
      ruleId,
      subsystem,
      name,
    });

    return { ruleId, name };
  }

  async evaluate(org: string, subsystem: string, name: string, input: any) {
    const result = nucleusGovernance.evaluate(org, subsystem, name, input);

    nucleusAudit.log(org, "governance", "rule.evaluate", "governance-service", {
      subsystem,
      name,
      result,
    });

    nucleusBilling.recordEvent(org, "governance", "rule.evaluate", 1, 0.001, {
      subsystem,
      name,
    });

    return { subsystem, name, result };
  }
}

export const valtarisGovernanceService = new GovernanceService();
