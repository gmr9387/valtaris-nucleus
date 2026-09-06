// src/nucleus/state/stateEngine.ts
// Unified constitutional distributed state engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type StateRecord = {
  id: string;
  org: string;
  subsystem: string;
  key: string;
  value: any;
  version: number;
  createdAt: number;
  updatedAt: number;
};

export type StateSnapshot = {
  id: string;
  org: string;
  subsystem: string;
  snapshot: Record<string, any>;
  timestamp: number;
};

export type StateDiff = {
  id: string;
  org: string;
  subsystem: string;
  key: string;
  before: any;
  after: any;
  timestamp: number;
};

export class StateEngine {
  private state: Map<string, StateRecord> = new Map();
  private snapshots: StateSnapshot[] = [];
  private diffs: StateDiff[] = [];

  private makeKey(org: string, subsystem: string, key: string) {
    return `${org}.${subsystem}.${key}`;
  }

  set(org: string, subsystem: string, key: string, value: any) {
    const compositeKey = this.makeKey(org, subsystem, key);
    const existing = this.state.get(compositeKey);

    const before = existing ? existing.value : null;

    const record: StateRecord = {
      id: existing?.id ?? randomUUID(),
      org,
      subsystem,
      key,
      value,
      version: existing ? existing.version + 1 : 1,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    this.state.set(compositeKey, record);

    const diff: StateDiff = {
      id: randomUUID(),
      org,
      subsystem,
      key,
      before,
      after: value,
      timestamp: Date.now(),
    };

    this.diffs.push(diff);

    const prefix = `[STATE][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Set ${key} → version ${record.version}`);

    // Audit
    nucleusAudit.log(
      org,
      subsystem,
      `state.set.${key}`,
      "state-engine",
      { before, after: value }
    );

    // Billing (state writes cost money)
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `state.set.${key}`,
      1,
      0.002, // $0.002 per state write
      { before, after: value }
    );

    return record;
  }

  get(org: string, subsystem: string, key: string) {
    const compositeKey = this.makeKey(org, subsystem, key);
    return this.state.get(compositeKey) ?? null;
  }

  snapshot(org: string, subsystem: string) {
    const snapshotData: Record<string, any> = {};

    for (const record of this.state.values()) {
      if (record.org === org && record.subsystem === subsystem) {
        snapshotData[record.key] = record.value;
      }
    }

    const snapshot: StateSnapshot = {
      id: randomUUID(),
      org,
      subsystem,
      snapshot: snapshotData,
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);

    const prefix = `[STATE][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Snapshot created`);

    // Audit
    nucleusAudit.log(
      org,
      subsystem,
      `state.snapshot`,
      "state-engine",
      { snapshot: snapshotData }
    );

    // Billing (snapshots cost money)
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `state.snapshot`,
      1,
      0.005, // $0.005 per snapshot
      { size: Object.keys(snapshotData).length }
    );

    return snapshot;
  }

  getDiffs(org?: string, subsystem?: string) {
    return this.diffs.filter((d) => {
      if (org && d.org !== org) return false;
      if (subsystem && d.subsystem !== subsystem) return false;
      return true;
    });
  }

  getSnapshots(org?: string, subsystem?: string) {
    return this.snapshots.filter((s) => {
      if (org && s.org !== org) return false;
      if (subsystem && s.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    this.state.clear();
    this.snapshots = [];
    this.diffs = [];
  }
}

export const nucleusState = new StateEngine();
