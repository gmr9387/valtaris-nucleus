// src/nucleus/health/healthEngine.ts
// Unified constitutional health engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusDiagnostics } from "../diagnostics/diagnosticsEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type HealthStatus = {
  id: string;
  org: string;
  subsystem: string;
  status: "healthy" | "degraded" | "unhealthy";
  diagnostics: Record<string, boolean>;
  timestamp: number;
};

export class HealthEngine {
  private statuses: HealthStatus[] = [];

  async check(org: string, subsystem: string) {
    const checks = nucleusDiagnostics.getChecks().filter(
      (c) => c.org === org && c.subsystem === subsystem
    );

    const diagnostics: Record<string, boolean> = {};
    let healthyCount = 0;

    for (const check of checks) {
      const result = await nucleusDiagnostics.execute(check.id);
      diagnostics[check.name] = result?.healthy ?? false;
      if (result?.healthy) healthyCount++;
    }

    let status: HealthStatus["status"] = "healthy";

    if (healthyCount === 0) {
      status = "unhealthy";
    } else if (healthyCount < checks.length) {
      status = "degraded";
    }

    const health: HealthStatus = {
      id: randomUUID(),
      org,
      subsystem,
      status,
      diagnostics,
      timestamp: Date.now(),
    };

    this.statuses.push(health);

    const prefix = `[HEALTH][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Status: ${status.toUpperCase()}`);

    // Audit
    nucleusAudit.log(
      org,
      subsystem,
      `health.status`,
      "health-engine",
      { status, diagnostics }
    );

    // Billing (health checks cost money)
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `health.status`,
      1,
      0.002, // $0.002 per health check
      { status }
    );

    return health;
  }

  getStatuses(org?: string, subsystem?: string) {
    return this.statuses.filter((s) => {
      if (org && s.org !== org) return false;
      if (subsystem && s.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    this.statuses = [];
  }
}

export const nucleusHealth = new HealthEngine();
