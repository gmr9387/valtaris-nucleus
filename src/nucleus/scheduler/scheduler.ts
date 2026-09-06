// src/nucleus/scheduler/scheduler.ts
// Unified constitutional scheduler for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type ScheduledTask = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  runAt: number; // timestamp
  payload?: any;
  createdAt: number;
};

export class Scheduler {
  private tasks: ScheduledTask[] = [];
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    this.start();
  }

  private start() {
    if (this.interval) return;

    // Check every second for due tasks.
    this.interval = setInterval(() => {
      const now = Date.now();

      const due = this.tasks.filter((t) => t.runAt <= now);
      if (due.length === 0) return;

      // Remove due tasks from queue.
      this.tasks = this.tasks.filter((t) => t.runAt > now);

      // Execute due tasks.
      for (const task of due) {
        try {
          this.execute(task);
        } catch (err) {
          console.error(`[Scheduler] Task execution error:`, err);
        }
      }
    }, 1000);
  }

  schedule(
    org: string,
    subsystem: string,
    type: string,
    runAt: number,
    payload?: any
  ) {
    const task: ScheduledTask = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      runAt,
      payload,
      createdAt: Date.now(),
    };

    this.tasks.push(task);
    return task;
  }

  private execute(task: ScheduledTask) {
    const prefix = `[SCHEDULER][${task.subsystem.toUpperCase()}]`;
    console.log(prefix, `Executing ${task.type}`, task.payload ?? "");

    // Later: route into unified event bus.
    // For now: emit console signal only.
  }

  getAll() {
    return [...this.tasks];
  }

  clear() {
    this.tasks = [];
  }
}

export const nucleusScheduler = new Scheduler();
