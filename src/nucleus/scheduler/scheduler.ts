// src/nucleus/scheduler/scheduler.ts
// Unified constitutional scheduler for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusQueue } from "../queue/queueEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type ScheduledTask = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  intervalMs: number;
  payload: any;
  createdAt: number;
};

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  register(
    org: string,
    subsystem: string,
    name: string,
    intervalMs: number,
    payload: any
  ) {
    const id = randomUUID();

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
    }, intervalMs);

    this.timers.set(id, timer);

    // Audit
    nucleusAudit.log(
      org,
      subsystem,
      `scheduler.${name}`,
      "scheduler-engine",
      { intervalMs, payload }
    );

    // Billing
    nucleusBilling.recordEvent(
      org,
      subsystem,
      `scheduler.${name}`,
      1,
      0.002, // $0.002 per scheduled cycle
      { intervalMs }
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
