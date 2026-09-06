// src/nucleus/state/stateStore.ts
// Unified constitutional state store for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type StateRecord = {
  id: string;
  org: string;
  subsystem: string;
  key: string;
  value: any;
  version: number;
  updatedAt: number;
};

export class StateStore {
  private store: Map<string, StateRecord> = new Map();

  private makeKey(org: string, subsystem: string, key: string) {
    return `${org}.${subsystem}.${key}`;
  }

  set(org: string, subsystem: string, key: string, value: any) {
    const compositeKey = this.makeKey(org, subsystem, key);

    const existing = this.store.get(compositeKey);

    const record: StateRecord = {
      id: existing?.id ?? randomUUID(),
      org,
      subsystem,
      key,
      value,
      version: existing ? existing.version + 1 : 1,
      updatedAt: Date.now(),
    };

    this.store.set(compositeKey, record);
    return record;
  }

  get(org: string, subsystem: string, key: string) {
    const compositeKey = this.makeKey(org, subsystem, key);
    return this.store.get(compositeKey) ?? null;
  }

  delete(org: string, subsystem: string, key: string) {
    const compositeKey = this.makeKey(org, subsystem, key);
    return this.store.delete(compositeKey);
  }

  getAllForSubsystem(org: string, subsystem: string) {
    const prefix = `${org}.${subsystem}.`;
    return [...this.store.values()].filter((r) =>
      r.id.startsWith(prefix)
    );
  }

  getAll() {
    return [...this.store.values()];
  }

  clear() {
    this.store.clear();
  }
}

export const nucleusState = new StateStore();
