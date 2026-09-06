// src/nucleus/diagnostics/diagnosticsEngine.ts
// Unified constitutional diagnostics engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type DiagnosticRecord = {
  id: string;
  org: string;
  subsystem: string;
  check: string;
  status: "pass" | "fail" | "warn";
  details?: any;
  timestamp: number;
};

export class DiagnosticsEngine {
  private records: DiagnosticRecord[] = [];

  runCheck(
    org: string,
    subsystem: string,
    check: string,
    status: DiagnosticRecord["status"],
    details?: any
  ) {
    const record: DiagnosticRecord = {
      id: randomUUID(),
      org,
      subsystem,
      check,
      status,
      details,
      timestamp: Date.now(),
    };

    this.records.push(record);

    const prefix = `[DIAGNOSTICS][${subsystem.toUpperCase()}]`;
    console.log(prefix, `${check} → ${status.toUpperCase()}`, details ?? "");

    return record;
  }

  getAll() {
    return [...this.records];
  }

  getBySubsystem(subsystem: string) {
    return this.records.filter((r) => r.subsystem === subsystem);
  }

  getByStatus(status: DiagnosticRecord["status"]) {
    return this.records.filter((r) => r.status === status);
  }

  clear() {
    this.records = [];
  }
}

export const nucleusDiagnostics = new DiagnosticsEngine();
