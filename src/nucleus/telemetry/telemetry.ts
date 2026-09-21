// src/nucleus/telemetry/telemetry.ts
// Unified telemetry spine for the entire Valtaris ecosystem.

import { NucleusDBBridge } from "../db/nucleusDBBridge";
import type { Dynamic } from "../types/dynamic";

// One bridge instance is enough here -- insertEvent takes organizationId
// per call, so there's no need for a fresh instance (or its own client)
// per emit.
const dbBridge = new NucleusDBBridge();

export type TelemetrySignal = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  level: "info" | "warn" | "error";
  message: string;
  payload?: Dynamic;
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
    payload?: Dynamic,
  ) {
    const signal: TelemetrySignal = {
      id: crypto.randomUUID(),
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
 * NOTE: there are now two independently-written telemetry
 * singletons both used across this codebase: this file's
 * "nucleusTelemetry" (a Telemetry instance) and
 * telemetryEngine.ts's "nucleusTelemetry" (a TelemetryEngine
 * instance) -- same export name, two different classes, two
 * different files. They have not been reconciled. This function
 * only wraps this file's Telemetry class, since that's what the
 * three broken callers were already adjacent to.
 *
 * FIXED: this only ever appended to the in-process `signals` array
 * above -- nothing from a real claim reached Supabase, despite
 * nucleus_events existing and being readable via `nucleus telemetry
 * <org>`. Every one of this function's real call sites (guardian/
 * weaver/glue/dualpay runtimes) is synchronous and unawaited, so this
 * now also fires a best-effort async persist via NucleusDBBridge
 * .insertEvent() without making the function itself async or
 * touching any of those 8 call sites: a Supabase hiccup logs and is
 * swallowed here rather than propagating into claim processing,
 * mirroring the fail-open pattern DualPay's own nucleus gate uses for
 * the same reason (an observability write must never be able to
 * break a real claim outcome).
 */
export function recordTelemetry(
  subsystem: string,
  eventType: string,
  claimId: string | undefined,
  organizationId: string,
  payload?: Dynamic,
) {
  const signal = nucleusTelemetry.emit(
    organizationId,
    subsystem,
    eventType,
    "info",
    claimId ? `${eventType} (claim ${claimId})` : eventType,
    payload,
  );

  dbBridge
    .insertEvent(organizationId, subsystem, eventType, { claimId: claimId ?? null }, payload ?? {})
    .catch((err) => console.error("[recordTelemetry] Supabase persist failed (non-fatal)", err));

  return signal;
}
