// src/nucleus/ops/nucleusDiagnostics.ts

/**
 * NucleusDiagnostics (Phase 11.4)
 *
 * Purpose:
 *   Provide runtime diagnostics:
 *     - metrics snapshot
 *     - telemetry snapshot
 *     - health snapshot
 */

import { NucleusMetrics } from "./nucleusMetrics";
import { NucleusTelemetry } from "./nucleusTelemetry";
import { NucleusHealth } from "./nucleusHealth";

export class NucleusDiagnostics {
  constructor(
    private metrics: NucleusMetrics,
    private telemetry: NucleusTelemetry,
    private health: NucleusHealth,
  ) {}

  snapshot(queue: { size: () => number }, port: number, workerActive: boolean) {
    return {
      metrics: this.metrics.all(),
      telemetry: this.telemetry.stream(),
      health: {
        server: this.health.checkServer(port),
        queue: this.health.checkQueue(queue),
        worker: this.health.checkWorker(workerActive),
        scheduler: this.health.checkScheduler(),
      },
    };
  }
}
