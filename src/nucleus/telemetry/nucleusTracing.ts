// src/nucleus/telemetry/nucleusTracing.ts
// Full file — Nucleus Tracing Engine

import type { Dynamic } from "../types/dynamic";
export class NucleusTracing {
  private spans: Record<string, Dynamic> = {};

  startSpan(name: string, subsystem: string) {
    const spanId = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.spans[spanId] = {
      id: spanId,
      name,
      subsystem,
      start: Date.now(),
      end: null,
    };

    return this.spans[spanId];
  }

  endSpan(spanId: string) {
    if (this.spans[spanId]) {
      this.spans[spanId].end = Date.now();
    }
  }

  getSpans() {
    return Object.values(this.spans);
  }
}
