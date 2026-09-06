// src/nucleus/metrics/metricsEngine.ts
// Unified constitutional metrics engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type MetricPoint = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
};

export type MetricAggregate = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  labels?: Record<string, string>;
  computedAt: number;
};

export class MetricsEngine {
  private points: MetricPoint[] = [];
  private aggregates: MetricAggregate[] = [];

  record(
    org: string,
    subsystem: string,
    name: string,
    value: number,
    labels?: Record<string, string>
  ) {
    const point: MetricPoint = {
      id: randomUUID(),
      org,
      subsystem,
      name,
      value,
      labels,
      timestamp: Date.now(),
    };

    this.points.push(point);

    const prefix = `[METRICS][${subsystem.toUpperCase()}]`;
    console.log(prefix, `${name} = ${value}`, labels ?? "");

    // Audit
    nucleusAudit.log(
      org,
      subsystem,
      `metrics.${name}`,
      "metrics-engine",
      { value, labels }
    );

    // Billing (metrics ingestion costs money)
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `metrics.${name}`,
      1,
      0.0005, // $0.0005 per metric point
      { value, labels }
    );

    return point;
  }

  computeAggregate(
    org: string,
    subsystem: string,
    name: string,
    labelsFilter?: Record<string, string>
  ) {
    const filtered = this.points.filter((p) => {
      if (p.org !== org || p.subsystem !== subsystem || p.name !== name) {
        return false;
      }
      if (labelsFilter) {
        for (const [k, v] of Object.entries(labelsFilter)) {
          if (!p.labels || p.labels[k] !== v) return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) return null;

    const values = filtered.map((p) => p.value);
    const sum = values.reduce((s, v) => s + v, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = sum / values.length;

    const aggregate: MetricAggregate = {
      id: randomUUID(),
      org,
      subsystem,
      name,
      count: filtered.length,
      sum,
      min,
      max,
      avg,
      labels: labelsFilter,
      computedAt: Date.now(),
    };

    this.aggregates.push(aggregate);

    const prefix = `[METRICS][${subsystem.toUpperCase()}]`;
    console.log(
      prefix,
      `Aggregate ${name}: count=${aggregate.count} avg=${aggregate.avg}`
    );

    // Audit
    nucleusAudit.log(
      org,
      subsystem,
      `metrics.aggregate.${name}`,
      "metrics-engine",
      { aggregate }
    );

    // Billing (aggregations cost money)
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `metrics.aggregate.${name}`,
      1,
      0.0015, // $0.0015 per aggregation
      { aggregate }
    );

    return aggregate;
  }

  getPoints(org?: string, subsystem?: string, name?: string) {
    return this.points.filter((p) => {
      if (org && p.org !== org) return false;
      if (subsystem && p.subsystem !== subsystem) return false;
      if (name && p.name !== name) return false;
      return true;
    });
  }

  getAggregates(org?: string, subsystem?: string, name?: string) {
    return this.aggregates.filter((a) => {
      if (org && a.org !== org) return false;
      if (subsystem && a.subsystem !== subsystem) return false;
      if (name && a.name !== name) return false;
      return true;
    });
  }

  clear() {
    this.points = [];
    this.aggregates = [];
  }
}

export const nucleusMetrics = new MetricsEngine();
