// src/nucleus/audit/auditEngine.ts
// Unified constitutional audit engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type AuditRecord = {
  id: string;
  org: string;
  subsystem: string;
  action: string;
  actor: string; // user, service, subsystem
  metadata?: any;
  timestamp: number;
};

export class AuditEngine {
  private records: AuditRecord[] = [];

  log(
    org: string,
    subsystem: string,
    action: string,
    actor: string,
    metadata?: any
  ) {
    const record: AuditRecord = {
      id: randomUUID(),
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

  clear() {
    this.records = [];
  }
}

export const nucleusAudit = new AuditEngine();
