// src/nucleus/state/stateSnapshot.ts
// Unified constitutional snapshot engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type SnapshotRecord = {
  id: string;
  org: string;
  subsystem: string;
  key: string;
  snapshot: any;
  version: number;
  createdAt: number;
};

export class SnapshotEngine {
  private snapshots: SnapshotRecord[] = [];

  createSnapshot(
    org: string,
    subsystem: string,
    key: string,
    snapshot: any,
    version: number
  ) {
    const record: SnapshotRecord = {
      id: randomUUID(),
      org,
      subsystem,
      key,
      snapshot,
      version,
      createdAt: Date.now(),
    };

    this.snapshots.push(record);

    const prefix = `[SNAPSHOT][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Snapshot created for ${key} v${version}`);

    return record;
  }

  getLatest(org: string, subsystem: string, key: string) {
    const matches = this.snapshots.filter(
      (s) => s.org === org && s.subsystem === subsystem && s.key === key
    );

    if (matches.length === 0) return null;

    return matches.sort((a, b) => b.version - a.version)[0];
  }

  getAllVersions(org: string, subsystem: string, key: string) {
    return this.snapshots
      .filter((s) => s.org === org && s.subsystem === subsystem && s.key === key)
      .sort((a, b) => b.version - a.version);
  }

  getAll() {
    return [...this.snapshots];
  }

  clear() {
    this.snapshots = [];
  }
}

export const nucleusSnapshot = new SnapshotEngine();
