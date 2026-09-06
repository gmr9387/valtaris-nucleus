// src/nucleus/metrics/metricsEngine.ts
// Unified constitutional metrics engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type MetricRecord = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
};

export class MetricsEngine {
  private metrics: MetricRecord[] = [];

  record(
    org: string,
    subsystem: string,
    name: string,
    value: number,
    tags?: Record<string, string>
  ) {
    const metric: MetricRecord = {
      id: randomUUID(),
      org,
      subsystem,
      name,
      value,
      tags,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // For now: console only. Later: Prometheus, OpenTelemetry, dashboards.
    const prefix = `[METRICS][${subsystem.toUpperCase()}]`;
    console.log(prefix, `${name} = ${value}`, tags ?? "");

    return metric;
  }

  getAll() {
    return [...this.metrics];
  }

  getBySubsystem(subsystem: string) {
    return this.metrics.filter((m) => m.subsystem === subsystem);
  }

  getByName(name: string) {
    return this.metrics.filter((m) => m.name === name);
  }

  clear() {
    this.metrics = [];
  }
}

export const nucleusMetrics = new MetricsEngine();
