// src/nucleus/telemetry/telemetry.ts
// Unified telemetry spine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type TelemetrySignal = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  level: "info" | "warn" | "error";
  message: string;
  payload?: any;
  timestamp: number;
};

export class Telemetry {
  private signals: TelemetrySignal[] = [];

  emit(
    org: string,
    subsystem: string,
    type: string,
    level: "info" | "warn" | "error",
    message: string,
    payload?: any
  ) {
    const signal: TelemetrySignal = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      level,
      message,
      payload,
      timestamp: Date.now(),
    };

    this.signals.push(signal);

    // For now, print to console. Later: route to metrics system.
    const prefix = `[${subsystem.toUpperCase()}][${level.toUpperCase()}]`;
    console.log(prefix, message, payload ?? "");

    return signal;
  }

  getAll() {
    return [...this.signals];
  }

  clear() {
    this.signals = [];
  }
}

export const nucleusTelemetry = new Telemetry();

/**
 * FIXED: added -- this function did not previously exist, but the
 * live subsystem handlers (guardianRuntime.ts, weaverRuntime.ts,
 * glueRuntime.ts -- 3 of the 4 real, .handle()-style runtimes
 * osPipeline.ts actually calls) all import and call it with the
 * same 5-argument shape: (subsystem, eventType, claimId,
 * organizationId, payload). Confirmed by reading all three call
 * sites directly, not just one. Without this, /api/claim throws
 * "recordTelemetry is not a function" immediately.
 *
 * NOTE: there are now two independently-written telemetry
 * singletons both used across this codebase: this file's
 * "nucleusTelemetry" (a Telemetry instance) and
 * telemetryEngine.ts's "nucleusTelemetry" (a TelemetryEngine
 * instance) -- same export name, two different classes, two
 * different files. They have not been reconciled. This function
 * only wraps this file's Telemetry class, since that's what the
 * three broken callers were already adjacent to.
 */
export function recordTelemetry(
  subsystem: string,
  eventType: string,
  claimId: string | undefined,
  organizationId: string,
  payload?: any
) {
  return nucleusTelemetry.emit(
    organizationId,
    subsystem,
    eventType,
    "info",
    claimId ? `${eventType} (claim ${claimId})` : eventType,
    payload
  );
}
