// src/nucleus/recovery/recoveryEngine.ts
// Unified constitutional recovery engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusHealth } from "../health/healthEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type RecoveryAction = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  description: string;
  run: () => Promise<boolean> | boolean;
  createdAt: number;
};

export type RecoveryResult = {
  id: string;
  actionId: string;
  org: string;
  subsystem: string;
  name: string;
  success: boolean;
  timestamp: number;
};

export class RecoveryEngine {
  private actions: Map<string, RecoveryAction> = new Map();
  private results: RecoveryResult[] = [];

  register(
    org: string,
    subsystem: string,
    name: string,
    description: string,
    run: RecoveryAction["run"]
  ) {
    const id = randomUUID();

    const action: RecoveryAction = {
      id,
      org,
      subsystem,
      name,
      description,
      run,
      createdAt: Date.now(),
    };

    this.actions.set(id, action);

    console.log(`[RECOVERY][${subsystem.toUpperCase()}] Registered action: ${name}`);

    return action;
  }

  async attemptRecovery(org: string, subsystem: string) {
    const health = await nucleusHealth.check(org, subsystem);

    if (health.status === "healthy") {
      console.log(`[RECOVERY][${subsystem.toUpperCase()}] No recovery needed`);
      return null;
    }

    const actions = [...this.actions.values()].filter(
      (a) => a.org === org && a.subsystem === subsystem
    );

    let success = false;

    for (const action of actions) {
      const result = await action.run();

      const record: RecoveryResult = {
        id: randomUUID(),
        actionId: action.id,
        org,
        subsystem,
        name: action.name,
        success: result,
        timestamp: Date.now(),
      };

      this.results.push(record);

      console.log(
        `[RECOVERY][${subsystem.toUpperCase()}] Action ${action.name} → ${result ? "SUCCESS" : "FAIL"}`
      );

      // Audit
      nucleusAudit.log(
        org,
        subsystem,
        `recovery.${action.name}`,
        "recovery-engine",
        { success: result }
      );

      // Billing (recovery attempts cost money)
      nucleusBilling.recordEvent(
        org,
        subsystem,
        `recovery.${action.name}`,
        1,
        0.004, // $0.004 per recovery attempt
        { success: result }
      );

      if (result) {
        success = true;
        break;
      }
    }

    return success;
  }

  getActions() {
    return [...this.actions.values()];
  }

  getResults() {
    return [...this.results];
  }

  clear() {
    this.actions.clear();
    this.results = [];
  }
}

export const nucleusRecovery = new RecoveryEngine();
