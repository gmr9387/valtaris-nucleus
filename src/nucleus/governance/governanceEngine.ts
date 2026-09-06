// src/nucleus/governance/governanceEngine.ts
// Unified constitutional governance engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type GovernanceRule = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  description: string;
  evaluate: (payload: any) => boolean;
  createdAt: number;
};

export type GovernanceDecision = {
  id: string;
  ruleId: string;
  org: string;
  subsystem: string;
  name: string;
  allowed: boolean;
  payload: any;
  timestamp: number;
};

export class GovernanceEngine {
  private rules: Map<string, GovernanceRule> = new Map();
  private decisions: GovernanceDecision[] = [];

  register(
    org: string,
    subsystem: string,
    name: string,
    description: string,
    evaluate: (payload: any) => boolean
  ) {
    const id = randomUUID();

    const rule: GovernanceRule = {
      id,
      org,
      subsystem,
      name,
      description,
      evaluate,
      createdAt: Date.now(),
    };

    this.rules.set(id, rule);

    console.log(`[GOV][${subsystem.toUpperCase()}] Registered rule: ${name}`);

    return rule;
  }

  enforce(ruleId: string, payload: any) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      console.error(`[GOV] Rule not found: ${ruleId}`);
      return null;
    }

    const allowed = rule.evaluate(payload);

    const decision: GovernanceDecision = {
      id: randomUUID(),
      ruleId,
      org: rule.org,
      subsystem: rule.subsystem,
      name: rule.name,
      allowed,
      payload,
      timestamp: Date.now(),
    };

    this.decisions.push(decision);

    const prefix = `[GOV][${rule.subsystem.toUpperCase()}]`;
    console.log(prefix, `${rule.name} → ${allowed ? "ALLOWED" : "DENIED"}`);

    // Audit
    nucleusAudit.log(
      rule.org,
      rule.subsystem,
      `governance.rule.${rule.name}`,
      "governance-engine",
      { allowed, payload }
    );

    // Billing (governance checks cost money)
    nucleusBilling.recordEvent(
      rule.org,
      rule.subsystem,
      `governance.rule.${rule.name}`,
      1,
      0.0015, // $0.0015 per governance check
      { allowed, payload }
    );

    return decision;
  }

  getRules() {
    return [...this.rules.values()];
  }

  getDecisions() {
    return [...this.decisions];
  }

  getDecisionsByRule(ruleId: string) {
    return this.decisions.filter((d) => d.ruleId === ruleId);
  }

  clear() {
    this.rules.clear();
    this.decisions = [];
  }
}

export const nucleusGovernance = new GovernanceEngine();
