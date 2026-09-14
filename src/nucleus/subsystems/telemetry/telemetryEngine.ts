// src/nucleus/subsystems/telemetry/telemetryEngine.ts

import type { Dynamic } from "../../types/dynamic";
export type TelemetryEvent = {
  subsystem: string;
  claimId: string;
  organizationId: string;
  payload: Record<string, Dynamic>;
  timestamp: number;
};

export class TelemetryEngine {
  static format(subsystem: string, payload: Dynamic): TelemetryEvent {
    return {
      subsystem,
      claimId: payload.claimId,
      organizationId: payload.organizationId,
      payload,
      timestamp: Date.now(),
    };
  }
}
