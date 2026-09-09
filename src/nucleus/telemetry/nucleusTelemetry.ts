// src/nucleus/telemetry/nucleusTelemetry.ts
// Full file swap — Nucleus Telemetry Engine

// FIXED: real file is "nucleusDBBridge.ts" (capital DB). This imported
// "nucleusDbBridge" (lowercase b) -- resolves fine on case-insensitive
// filesystems (Mac/Windows dev machines) but fails on Linux/CI/prod.
// Confirmed by actually running the boot chain, not just compiling it.
import { NucleusDBBridge } from "../db/nucleusDBBridge";

export type TelemetryLevel = "info" | "warn" | "error" | "debug";

export class NucleusTelemetry {
  private db = new NucleusDBBridge();

  async emit(
    organizationId: string,
    subsystem: string,
    level: TelemetryLevel,
    message: string,
    metadata: any = null
  ) {
    await this.db.insertTelemetry(
      organizationId,
      subsystem,
      level,
      message,
      metadata
    );
  }
}
