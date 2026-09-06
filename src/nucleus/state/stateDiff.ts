// src/nucleus/state/stateDiff.ts
// Unified constitutional diff engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type DiffRecord = {
  id: string;
  org: string;
  subsystem: string;
  key: string;
  before: any;
  after: any;
  diff: any;
  version: number;
  createdAt: number;
};

export class DiffEngine {
  private diffs: DiffRecord[] = [];

  createDiff(
    org: string,
    subsystem: string,
    key: string,
    before: any,
    after: any,
    version: number
  ) {
    const diff = this.computeDiff(before, after);

    const record: DiffRecord = {
      id: randomUUID(),
      org,
      subsystem,
      key,
      before,
      after,
      diff,
      version,
      createdAt: Date.now(),
    };

    this.diffs.push(record);

    const prefix = `[DIFF][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Diff created for ${key} v${version}`);

    return record;
  }

  private computeDiff(before: any, after: any) {
    const changes: Record<string, { before: any; after: any }> = {};

    const keys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    for (const key of keys) {
      const b = before?.[key];
      const a = after?.[key];

      if (JSON.stringify(b) !== JSON.stringify(a)) {
        changes[key] = { before: b, after: a };
      }
    }

    return changes;
  }

  getLatest(org: string, subsystem: string, key: string) {
    const matches = this.diffs.filter(
      (d) => d.org === org && d.subsystem === subsystem && d.key === key
    );

    if (matches.length === 0) return null;

    return matches.sort((a, b) => b.version - a.version)[0];
  }

  getAllVersions(org: string, subsystem: string, key: string) {
    return this.diffs
      .filter((d) => d.org === org && d.subsystem === subsystem && d.key === key)
      .sort((a, b) => b.version - a.version);
  }

  getAll() {
    return [...this.diffs];
  }

  clear() {
    this.diffs = [];
  }
}

export const nucleusDiff = new DiffEngine();
