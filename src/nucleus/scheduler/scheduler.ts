// src/nucleus/scheduler/scheduler.ts
// Unified constitutional scheduler for the entire Valtaris ecosystem.

import { nucleusQueue } from "../queue/queueEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";
import type { Dynamic } from "../types/dynamic";

export type ScheduledTask = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  intervalMs: number;
  payload: Dynamic;
  createdAt: number;
};

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * FIXED (before this had a real caller): every tick just called
   * nucleusQueue.enqueue() with nothing ever consuming the queue it
   * enqueued onto -- messages piled up forever with no delivery, no
   * result, and no way to tell a live schedule from a broken one.
   * queueEngine.ts already has a deliver(queue, handler) half of that
   * pair; this now calls it right after enqueueing, same
   * enqueue-then-deliver shape TelemetryAdapter already uses. handler
   * is optional so a caller that genuinely only wants queue backlog
   * (a real work queue another process drains later) can still get
   * that by omitting it.
   */
  register(
    org: string,
    subsystem: string,
    name: string,
    intervalMs: number,
    payload: Dynamic,
    handler?: (msg: Dynamic) => Promise<Dynamic> | Dynamic,
  ) {
    const id = crypto.randomUUID();

    const task: ScheduledTask = {
      id,
      org,
      subsystem,
      name,
      intervalMs,
      payload,
      createdAt: Date.now(),
    };

    this.tasks.set(id, task);

    console.log(`[SCHEDULER][${subsystem.toUpperCase()}] Registered: ${name}`);

    const timer = setInterval(() => {
      nucleusQueue.enqueue(org, subsystem, payload);
      if (handler) {
        nucleusQueue.deliver(subsystem, (msg) => handler(msg.payload));
      }
    }, intervalMs);

    this.timers.set(id, timer);

    // Audit
    nucleusAudit.log(org, subsystem, `scheduler.${name}`, "scheduler-engine", {
      intervalMs,
      payload,
    });

    // Billing
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `scheduler.${name}`,
      1,
      0.002, // $0.002 per scheduled cycle
      { intervalMs },
    );

    return task;
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.tasks.clear();
    this.timers.clear();
  }
}

export const nucleusScheduler = new Scheduler();
