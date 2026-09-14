// Phase 22 — Telemetry Store

import { TelemetryEntry } from "./telemetryEntry";

export class TelemetryStore {
  private entries: TelemetryEntry[] = [];

  record(entry: TelemetryEntry) {
    this.entries.push(entry);
  }

  list(): TelemetryEntry[] {
    return [...this.entries];
  }

  listBySubsystem(subsystem: string): TelemetryEntry[] {
    return this.entries.filter((e) => e.subsystem === subsystem);
  }

  listByCapability(capability: string): TelemetryEntry[] {
    return this.entries.filter((e) => e.capability === capability);
  }

  listErrors(): TelemetryEntry[] {
    return this.entries.filter((e) => e.error !== undefined);
  }

  listSlowEvents(thresholdMs: number): TelemetryEntry[] {
    return this.entries.filter((e) => (e.latencyMs ?? 0) > thresholdMs);
  }
}

export const telemetryStore = new TelemetryStore();
