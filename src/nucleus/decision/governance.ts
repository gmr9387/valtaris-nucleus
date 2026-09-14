// src/nucleus/decision/governance.ts
// Full file swap — Governance rule engine

import type { Dynamic } from "../types/dynamic";
export type GovernanceRule = {
  id: string;
  name: string;
  condition: (ctx: Dynamic) => boolean;
  effect: "allow" | "deny";
};

export class Governance {
  private rules: GovernanceRule[] = [];

  addRule(rule: GovernanceRule) {
    this.rules.push(rule);
  }

  evaluate(context: Dynamic): "allow" | "deny" {
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        return rule.effect;
      }
    }
    return "allow";
  }
}
