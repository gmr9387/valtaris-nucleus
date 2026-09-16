// src/nucleus/audit/auditEngine.ts
// Unified constitutional audit engine for the entire Valtaris ecosystem.

import type { Dynamic } from "../types/dynamic";

export type AuditRecord = {
  id: string;
  org: string;
  subsystem: string;
  action: string;
  actor: string; // user, service, subsystem
  metadata?: Dynamic;
  timestamp: number;
};

export class AuditEngine {
  private records: AuditRecord[] = [];

  log(org: string, subsystem: string, action: string, actor: string, metadata?: Dynamic) {
    const record: AuditRecord = {
      id: crypto.randomUUID(),
      org,
      subsystem,
      action,
      actor,
      metadata,
      timestamp: Date.now(),
    };

    this.records.push(record);

    const prefix = `[AUDIT][${subsystem.toUpperCase()}]`;
    console.log(prefix, `${action} by ${actor}`);

    return record;
  }

  getAll() {
    return [...this.records];
  }

  getByOrg(org: string) {
    return this.records.filter((r) => r.org === org);
  }

  getBySubsystem(subsystem: string) {
    return this.records.filter((r) => r.subsystem === subsystem);
  }

  getByActor(actor: string) {
    return this.records.filter((r) => r.actor === actor);
  }

  getByAction(action: string) {
    return this.records.filter((r) => r.action === action);
  }

  /**
   * The "reports" half of gapMap.md's "Unified Audit Engine (reports +
   * proofs)" gap. log()/getAll()/getBy*() were the raw trail; nothing
   * aggregated it into something a person or a CI suite could actually
   * read as a summary. Real aggregation over whatever's actually in
   * the log -- not a placeholder -- since every engine in this family
   * (state, queue, retry, scheduler, certification, ...) already calls
   * log() on real work.
   */
  report(org?: string) {
    const records = org ? this.getByOrg(org) : this.getAll();

    const byAction: Record<string, number> = {};
    const bySubsystem: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const r of records) {
      byAction[r.action] = (byAction[r.action] ?? 0) + 1;
      bySubsystem[r.subsystem] = (bySubsystem[r.subsystem] ?? 0) + 1;
      byActor[r.actor] = (byActor[r.actor] ?? 0) + 1;
    }

    return {
      totalRecords: records.length,
      byAction,
      bySubsystem,
      byActor,
      firstTimestamp: records.length ? Math.min(...records.map((r) => r.timestamp)) : null,
      lastTimestamp: records.length ? Math.max(...records.map((r) => r.timestamp)) : null,
    };
  }

  clear() {
    this.records = [];
  }
}

export const nucleusAudit = new AuditEngine();
