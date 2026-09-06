// src/nucleus/access/accessEngine.ts
// Unified constitutional access control engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type AccessRule = {
  id: string;
  org: string;
  subsystem: string;
  role: string;
  action: string;
  allowed: boolean;
  createdAt: number;
};

export class AccessEngine {
  private rules: Map<string, AccessRule> = new Map();

  define(org: string, subsystem: string, role: string, action: string, allowed: boolean) {
    const id = randomUUID();

    const rule: AccessRule = {
      id,
      org,
      subsystem,
      role,
      action,
      allowed,
      createdAt: Date.now(),
    };

    this.rules.set(id, rule);

    console.log(`[ACCESS][${subsystem.toUpperCase()}] Rule: ${role} → ${action} = ${allowed}`);

    nucleusAudit.log(org, subsystem, `access.define.${role}.${action}`, "access-engine", { allowed });
    nucleusBilling.recordEvent(org, subsystem, `access.define.${role}.${action}`, 1, 0.0015, { allowed });

    return rule;
  }

  check(org: string, subsystem: string, role: string, action: string) {
    const rule = [...this.rules.values()].find(
      (r) => r.org === org && r.subsystem === subsystem && r.role === role && r.action === action
    );

    const allowed = rule?.allowed ?? false;

    console.log(`[ACCESS][${subsystem.toUpperCase()}] Check: ${role} → ${action} = ${allowed}`);

    nucleusAudit.log(org, subsystem, `access.check.${role}.${action}`, "access-engine", { allowed });
    nucleusBilling.recordEvent(org, subsystem, `access.check.${role}.${action}`, 1, 0.001, { allowed });

    return allowed;
  }

  getRules() {
    return [...this.rules.values()];
  }

  clear() {
    this.rules.clear();
  }
}

export const nucleusAccess = new AccessEngine();
