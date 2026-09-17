// src/nucleus/telemetry/telemetryEngine.ts
// Unified constitutional telemetry engine for the entire Valtaris ecosystem.
//
// gapMap.md flagged two independently-written, same-named "nucleusTelemetry"
// singletons: this file's, and telemetry/telemetry.ts's. This one was
// written to exactly once per process, at boot (nucleusRuntime.ts's
// "runtime.boot" event); telemetry.ts's is what weaver/guardian/glue/
// dualpay's real runtimes actually call via recordTelemetry() on every
// claim dispatch. Every real reader of this class's list()/getEvents()
// (constitutionalPipeline.ts's "telemetry.initialize" step, ciSuites.ts,
// internalStatusController.ts, the CLI's `telemetry` command) was
// therefore seeing at most one boot-time entry, never real claim
// activity, regardless of how much real telemetry the system had
// actually produced.
//
// recordEvent()/getEvents()/list() now delegate to telemetry.ts's live
// store instead of keeping a second, permanently-behind array -- so the
// boot event and every real per-claim signal land in the same place,
// and every real reader above sees both. Left unresolved: telemetry.ts's
// Telemetry.emit() has no audit/billing hooks the way every other engine
// wired live this session does, so per-claim telemetry entries (unlike
// this boot event) still don't carry an audit/billing trail -- adding
// that would add a new audit+billing entry to every single claim
// dispatch (5x per claim), a real cost-model change worth its own
// decision, not a side effect of a consolidation pass.

import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";
import { nucleusTelemetry as liveTelemetry, recordTelemetry } from "./telemetry";
import type { Dynamic } from "../types/dynamic";

export type TelemetryEvent = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  payload: Dynamic;
  timestamp: number;
  // Not populated by recordEvent()/emit() today -- federation/constitution
  // callers that filter by tenant/environment degrade to an empty result
  // until telemetry recording is extended to carry identity.
  identity?: import("../identity/nucleusIdentity").NucleusIdentity;
};

export type TelemetrySpan = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: Record<string, Dynamic>;
};

export class TelemetryEngine {
  private spans: Map<string, TelemetrySpan> = new Map();

  recordEvent(org: string, subsystem: string, type: string, payload: Dynamic): TelemetryEvent {
    const signal = recordTelemetry(subsystem, type, undefined, org, payload);

    // Audit
    nucleusAudit.log(org, subsystem, `telemetry.event.${type}`, "telemetry-engine", { payload });

    // Billing (telemetry events cost money)
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `telemetry.event.${type}`,
      1,
      0.0008, // $0.0008 per telemetry event
      { payload },
    );

    return {
      id: signal.id,
      org: signal.org,
      subsystem: signal.subsystem,
      type: signal.type,
      payload: signal.payload,
      timestamp: signal.timestamp,
    };
  }

  startSpan(org: string, subsystem: string, name: string, metadata?: Record<string, Dynamic>) {
    const span: TelemetrySpan = {
      id: crypto.randomUUID(),
      org,
      subsystem,
      name,
      start: Date.now(),
      metadata,
    };

    this.spans.set(span.id, span);

    const prefix = `[TELEMETRY][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Span started: ${name}`);

    return span;
  }

  endSpan(spanId: string) {
    const span = this.spans.get(spanId);
    if (!span) {
      console.error(`[TELEMETRY] Span not found: ${spanId}`);
      return null;
    }

    span.end = Date.now();
    span.duration = span.end - span.start;

    const prefix = `[TELEMETRY][${span.subsystem.toUpperCase()}]`;
    console.log(prefix, `Span ended: ${span.name} (${span.duration}ms)`);

    // Audit
    nucleusAudit.log(span.org, span.subsystem, `telemetry.span.${span.name}`, "telemetry-engine", {
      duration: span.duration,
      metadata: span.metadata,
    });

    // Billing (span recording costs money)
    nucleusBilling.recordEvent(
      span.org,
      span.subsystem,
      `telemetry.span.${span.name}`,
      1,
      0.0012, // $0.0012 per span
      { duration: span.duration },
    );

    return span;
  }

  getEvents(org?: string, subsystem?: string): TelemetryEvent[] {
    return liveTelemetry
      .getAll()
      .filter((s) => {
        if (org && s.org !== org) return false;
        if (subsystem && s.subsystem !== subsystem) return false;
        return true;
      })
      .map((s) => ({
        id: s.id,
        org: s.org,
        subsystem: s.subsystem,
        type: s.type,
        payload: s.payload,
        timestamp: s.timestamp,
      }));
  }

  getSpans(org?: string, subsystem?: string) {
    return [...this.spans.values()].filter((s) => {
      if (org && s.org !== org) return false;
      if (subsystem && s.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    liveTelemetry.clear();
    this.spans.clear();
  }

  list(): TelemetryEvent[] {
    return this.getEvents();
  }
}

export const nucleusTelemetry = new TelemetryEngine();
// Alias matching the module-name convention several callers already use.
export const telemetryEngine = nucleusTelemetry;
