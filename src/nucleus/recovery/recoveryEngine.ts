// src/nucleus/recovery/recoveryEngine.ts
// Unified constitutional recovery engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type RecoveryAction = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  reason: string;
  payload?: any;
  createdAt: number;
  executed: boolean;
};

export class RecoveryEngine {
  private actions: RecoveryAction[] = [];

  register(
    org: string,
    subsystem: string,
    type: string,
    reason: string,
    payload?: any
  ) {
    const action: RecoveryAction = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      reason,
      payload,
      createdAt: Date.now(),
      executed: false,
    };

    this.actions.push(action);
    return action;
  }

  execute(actionId: string) {
    const action = this.actions.find((a) => a.id === actionId);
    if (!action) {
      console.error(`[Recovery] No action found for ID ${actionId}`);
      return null;
    }

    if (action.executed) {
      console.log(`[Recovery] Action ${actionId} already executed.`);
      return action;
    }

    const prefix = `[RECOVERY][${action.subsystem.toUpperCase()}]`;
    console.log(prefix, `Recovering from: ${action.reason}`, action.payload ?? "");

    // Later: route into unified event bus.
    // For now: console only.

    action.executed = true;
    return action;
  }

  executeAllPending() {
    const pending = this.actions.filter((a) => !a.executed);

    for (const action of pending) {
      this.execute(action.id);
    }

    return pending;
  }

  getAll() {
    return [...this.actions];
  }

  getPending() {
    return this.actions.filter((a) => !a.executed);
  }

  clear() {
    this.actions = [];
  }
}

export const nucleusRecovery = new RecoveryEngine();
