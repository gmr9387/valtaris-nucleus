// src/nucleus/diagnostics/diagnosticsEngine.ts
// Unified constitutional diagnostics engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type DiagnosticCheck = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  description: string;
  run: () => Promise<boolean> | boolean;
  createdAt: number;
};

export type DiagnosticResult = {
  id: string;
  checkId: string;
  org: string;
  subsystem: string;
  name: string;
  healthy: boolean;
  timestamp: number;
};

export class DiagnosticsEngine {
  private checks: Map<string, DiagnosticCheck> = new Map();
  private results: DiagnosticResult[] = [];

  register(
    org: string,
    subsystem: string,
    name: string,
    description: string,
    run: DiagnosticCheck["run"]
  ) {
    const id = randomUUID();

    const check: DiagnosticCheck = {
      id,
      org,
      subsystem,
      name,
      description,
      run,
      createdAt: Date.now(),
    };

    this.checks.set(id, check);

    console.log(`[DIAG][${subsystem.toUpperCase()}] Registered check: ${name}`);

    return check;
  }

  async execute(checkId: string) {
    const check = this.checks.get(checkId);
    if (!check) {
      console.error(`[DIAG] Check not found: ${checkId}`);
      return null;
    }

    const healthy = await check.run();

    const result: DiagnosticResult = {
      id: randomUUID(),
      checkId,
      org: check.org,
      subsystem: check.subsystem,
      name: check.name,
      healthy,
      timestamp: Date.now(),
    };

    this.results.push(result);

    const prefix = `[DIAG][${check.subsystem.toUpperCase()}]`;
    console.log(prefix, `${check.name} → ${healthy ? "HEALTHY" : "UNHEALTHY"}`);

    // Audit
    nucleusAudit.log(
      check.org,
      check.subsystem,
      `diagnostics.${check.name}`,
      "diagnostics-engine",
      { healthy }
    );

    // Billing (diagnostic checks cost money)
    nucleusBilling.recordEvent(
      check.org,
      check.subsystem,
      `diagnostics.${check.name}`,
      1,
      0.001, // $0.001 per diagnostic check
      { healthy }
    );

    return result;
  }

  getChecks() {
    return [...this.checks.values()];
  }

  getResults(checkId?: string) {
    if (!checkId) return [...this.results];
    return this.results.filter((r) => r.checkId === checkId);
  }

  clear() {
    this.checks.clear();
    this.results = [];
  }
}

export const nucleusDiagnostics = new DiagnosticsEngine();
