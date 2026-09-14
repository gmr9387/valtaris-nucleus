// src/nucleus/subsystems/telemetry/telemetryAdapter.ts

import { TelemetryRuntime } from "./telemetryRuntime";
import type { Dynamic } from "../../types/dynamic";

export class TelemetryAdapter {
  static send(subsystem: string, payload: Dynamic) {
    return TelemetryRuntime.emit(subsystem, payload);
  }
}
