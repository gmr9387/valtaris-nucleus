// services/monitoring/monitoringService.ts
// Monitoring Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusMetrics } from "../../src/nucleus/metrics/metricsEngine";
import { nucleusTelemetry } from "../../src/nucleus/telemetry/telemetryEngine";
import { nucleusHealth } from "../../src/nucleus/health/healthEngine";
import { nucleusDiagnostics } from "../../src/nucleus/diagnostics/diagnosticsEngine";
import { nucleusState } from "../../src/nucleus/state/stateEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";

export class MonitoringService {
  async recordMetric(org: string, subsystem: string, name: string, value: number) {
    const metricId = randomUUID();

    nucleusMetrics.record(org, subsystem, name, { metricId, value });

    nucleusAudit.log(org, "monitoring", "metric.record", "monitoring-service", {
      metricId,
      subsystem,
      name,
      value,
    });

    nucleusBilling.recordEvent(org, "monitoring", "metric.record", 1, 0.001, {
      subsystem,
      name,
    });

    return { metricId, subsystem, name, value };
  }

  async recordTelemetry(org: string, subsystem: string, event: string, payload: any) {
    const telemetryId = randomUUID();

    nucleusTelemetry.record(org, subsystem, event, {
      telemetryId,
      payload,
    });

    nucleusAudit.log(org, "monitoring", "telemetry.record", "monitoring-service", {
      telemetryId,
      subsystem,
      event,
    });

    return { telemetryId, subsystem, event };
  }

  async health(org: string) {
    const health = nucleusHealth.check(org);

    nucleusDiagnostics.run(org, "monitoring");

    nucleusAudit.log(org, "monitoring", "health.check", "monitoring-service", {
      health,
    });

    return health;
  }

  async getMetrics(org: string) {
    return nucleusState.getAll(org, "metrics") ?? [];
  }

  async getTelemetry(org: string) {
    return nucleusState.getAll(org, "telemetry") ?? [];
  }
}

export const valtarisMonitoringService = new MonitoringService();
