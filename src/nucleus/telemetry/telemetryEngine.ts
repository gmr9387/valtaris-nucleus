// src/nucleus/telemetry/telemetryEngine.ts
// Unified constitutional telemetry engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type TelemetryEvent = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  payload: any;
  timestamp: number;
};

export type TelemetrySpan = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: Record<string, any>;
};

export class TelemetryEngine {
  private events: TelemetryEvent[] = [];
  private spans: Map<string, TelemetrySpan> = new Map();

  recordEvent(
    org: string,
    subsystem: string,
    type: string,
    payload: any
  ) {
    const event: TelemetryEvent = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      payload,
      timestamp: Date.now(),
    };

    this.events.push(event);

    const prefix = `[TELEMETRY][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Event: ${type}`);

    // Audit
    nucleusAudit.log(
      org,
      subsystem,
      `telemetry.event.${type}`,
      "telemetry-engine",
      { payload }
    );

    // Billing (telemetry events cost money)
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `telemetry.event.${type}`,
      1,
      0.0008, // $0.0008 per telemetry event
      { payload }
    );

    return event;
  }

  startSpan(
    org: string,
    subsystem: string,
    name: string,
    metadata?: Record<string, any>
  ) {
    const span: TelemetrySpan = {
      id: randomUUID(),
      org,
      subsystem,
      name,
      start: Date.now(),
      metadata,
    };

    this.spans.set(span.id, span);

    const prefix = `[TELEMETRY][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Span started: ${name}`);

    return span;
  }

  endSpan(spanId: string) {
    const span = this.spans.get(spanId);
    if (!span) {
      console.error(`[TELEMETRY] Span not found: ${spanId}`);
      return null;
    }

    span.end = Date.now();
    span.duration = span.end - span.start;

    const prefix = `[TELEMETRY][${span.subsystem.toUpperCase()}]`;
    console.log(prefix, `Span ended: ${span.name} (${span.duration}ms)`);

    // Audit
    nucleusAudit.log(
      span.org,
      span.subsystem,
      `telemetry.span.${span.name}`,
      "telemetry-engine",
      { duration: span.duration, metadata: span.metadata }
    );

    // Billing (span recording costs money)
    nucleusBilling.recordEvent(
      span.org,
      span.subsystem,
      `telemetry.span.${span.name}`,
      1,
      0.0012, // $0.0012 per span
      { duration: span.duration }
    );

    return span;
  }

  getEvents(org?: string, subsystem?: string) {
    return this.events.filter((e) => {
      if (org && e.org !== org) return false;
      if (subsystem && e.subsystem !== subsystem) return false;
      return true;
    });
  }

  getSpans(org?: string, subsystem?: string) {
    return [...this.spans.values()].filter((s) => {
      if (org && s.org !== org) return false;
      if (subsystem && s.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    this.events = [];
    this.spans.clear();
  }
}

export const nucleusTelemetry = new TelemetryEngine();
