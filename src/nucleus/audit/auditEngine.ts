// src/nucleus/audit/auditEngine.ts
// Unified constitutional audit engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type AuditRecord = {
  id: string;
  org: string;
  subsystem: string;
  action: string;
  category: "pipeline" | "workflow" | "governance" | "payment" | "runtime" | "certification";
  status: "success" | "failure";
  details?: any;
  timestamp: number;
};

export class AuditEngine {
  private records: AuditRecord[] = [];

  log(
    org: string,
    subsystem: string,
    action: string,
    category: AuditRecord["category"],
    status: AuditRecord["status"],
    details?: any
  ) {
    const record: AuditRecord = {
      id: randomUUID(),
      org,
      subsystem,
      action,
      category,
      status,
      details,
      timestamp: Date.now(),
    };

    this.records.push(record);

    // For now, print to console. Later: route to audit reports + proofs.
    const prefix = `[AUDIT][${subsystem.toUpperCase()}][${status.toUpperCase()}]`;
    console.log(prefix, action, details ?? "");

    return record;
  }

  getAll() {
    return [...this.records];
  }

  getBySubsystem(subsystem: string) {
    return this.records.filter((r) => r.subsystem === subsystem);
  }

  getByCategory(category: AuditRecord["category"]) {
    return this.records.filter((r) => r.category === category);
  }

  clear() {
    this.records = [];
  }
}

export const nucleusAudit = new AuditEngine();
