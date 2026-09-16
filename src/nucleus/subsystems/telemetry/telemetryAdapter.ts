// src/nucleus/subsystems/telemetry/telemetryAdapter.ts

import { TelemetryRuntime } from "./telemetryRuntime";
import { nucleusQueue } from "../../queue/queueEngine";
import type { Dynamic } from "../../types/dynamic";

/**
 * Routes every stage's telemetry through QueueEngine rather than
 * calling TelemetryRuntime.emit() directly. QueueEngine (src/nucleus/
 * queue/queueEngine.ts) was fully built -- enqueue/dequeue/deliver,
 * retry-on-failure, audit + billing hooks -- but had zero real callers
 * anywhere in the codebase; gapMap.md still lists "Formal Queue Layer"
 * as a missing system despite a working implementation already sitting
 * there unwired. This is the first live caller: telemetry is the
 * right place to start it (observability, not decision-critical, so
 * queue behavior that's imperfect at the margins can't corrupt a
 * claim outcome) rather than inventing a synthetic exercise.
 *
 * enqueue() immediately followed by deliver() on the same queue name
 * keeps this effectively synchronous in practice (no concurrent
 * producer to race against a dequeue) while giving every telemetry
 * event a real audit trail, a billing event, and queue-level failure
 * tracking it didn't have when TelemetryRuntime.emit() was called
 * directly.
 */
export class TelemetryAdapter {
  static async send(subsystem: string, payload: Dynamic) {
    const org = payload?.organizationId ?? payload?.org ?? "unknown";
    const queueName = `telemetry.${subsystem}`;

    nucleusQueue.enqueue(org, queueName, payload);

    return nucleusQueue.deliver(queueName, (msg) => TelemetryRuntime.emit(subsystem, msg.payload));
  }
}
