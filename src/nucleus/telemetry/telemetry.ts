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
