// src/nucleus/ops/nucleusTelemetry.ts

import type { Dynamic } from "../types/dynamic";
/**
 * NucleusTelemetry (Phase 11.2)
 *
 * Purpose:
 *   Emit lightweight telemetry events for:
 *     - contract emissions
 *     - subsystem activity
 *     - performance samples
 */

export class NucleusTelemetry {
  private events: Dynamic[] = [];

  record(event: string, payload: Dynamic) {
    this.events.push({
      event,
      payload,
      at: Date.now(),
    });
  }

  stream() {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}
