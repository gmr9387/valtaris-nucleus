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
 *
 * Both calls are now real DB operations (queueEngine.ts is backed by
 * nucleus_queue_messages, not an in-memory Map), so they can genuinely
 * reject -- e.g. the service-role credentials queueDB.ts needs aren't
 * configured in this process. Every real call site (osPipeline.ts)
 * fires this without awaiting or catching, by design: telemetry is
 * observability, not decision-critical, and must never be able to
 * fail a claim. Catching here, not at each call site, keeps that
 * guarantee in one place.
 */
export class TelemetryAdapter {
  static async send(subsystem: string, payload: Dynamic) {
    const org = payload?.organizationId ?? payload?.org ?? "unknown";
    const queueName = `telemetry.${subsystem}`;

    try {
      // Enqueue must be awaited now that it's a real DB insert --
      // calling deliver() before the insert lands would race the
      // dequeue against it and find nothing to claim.
      await nucleusQueue.enqueue(org, queueName, payload);
      return await nucleusQueue.deliver(queueName, (msg) =>
        TelemetryRuntime.emit(subsystem, msg.payload),
      );
    } catch (err) {
      console.error(`[TelemetryAdapter] send(${subsystem}) failed (non-fatal):`, err);
      return null;
    }
  }
}
