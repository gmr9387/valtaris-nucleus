// src/nucleus/subsystems/telemetry/telemetryEngine.ts

export type TelemetryEvent = {
  subsystem: string;
  claimId: string;
  organizationId: string;
  payload: Record<string, any>;
  timestamp: number;
};

export class TelemetryEngine {
  static format(subsystem: string, payload: any): TelemetryEvent {
    return {
      subsystem,
      claimId: payload.claimId,
      organizationId: payload.organizationId,
      payload,
      timestamp: Date.now(),
    };
  }
}
