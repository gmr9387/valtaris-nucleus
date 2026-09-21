// src/nucleus/telemetry/nucleusTelemetry.ts
// Full file swap — Nucleus Telemetry Engine

// FIXED: real file is "nucleusDBBridge.ts" (capital DB). This imported
// "nucleusDbBridge" (lowercase b) -- resolves fine on case-insensitive
// filesystems (Mac/Windows dev machines) but fails on Linux/CI/prod.
// Confirmed by actually running the boot chain, not just compiling it.
import { NucleusDBBridge } from "../db/nucleusDBBridge";
import type { Dynamic } from "../types/dynamic";

export type TelemetryLevel = "info" | "warn" | "error" | "debug";

export class NucleusTelemetry {
  private db = new NucleusDBBridge();

  /**
   * FIXED: callers of NucleusTelemetryAdapter's info/warn/error/debug
   * (e.g. DecisionEngine.evaluate(), now wired into every real claim via
   * OSPipeline) call them without awaiting the returned promise -- a
   * deliberate, correct choice, since observability must never block or
   * fail real processing. But insertTelemetry() previously never
   * actually reached Supabase (it recursed into itself indefinitely --
   * see nucleusDBBridge.ts), so a real rejection from it was never
   * possible in practice. Now that it's fixed and can genuinely reject
   * (e.g. this sandbox's network egress doesn't reach Supabase), an
   * un-awaited call that throws becomes an unhandled promise rejection.
   * Catching here, not at each unawaited call site, keeps every current
   * and future caller of this class safe by construction.
   */
  async emit(
    organizationId: string,
    subsystem: string,
    level: TelemetryLevel,
    message: string,
    metadata: Dynamic = null,
  ) {
    try {
      await this.db.insertTelemetry(organizationId, subsystem, level, message, metadata);
    } catch (err) {
      console.error("[NucleusTelemetry] emit persist failed (non-fatal)", err);
    }
  }
}
