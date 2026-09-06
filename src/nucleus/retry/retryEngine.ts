// src/nucleus/retry/retryEngine.ts
// Unified constitutional retry engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type RetryTask = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  payload?: any;
  createdAt: number;
  nextRunAt: number;
};

export class RetryEngine {
  private tasks: RetryTask[] = [];
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    this.start();
  }

  private start() {
    if (this.interval) return;

    // Check every second for due retry tasks.
    this.interval = setInterval(() => {
      const now = Date.now();

      const due = this.tasks.filter((t) => t.nextRunAt <= now);
      if (due.length === 0) return;

      // Remove due tasks from queue.
      this.tasks = this.tasks.filter((t) => t.nextRunAt > now);

      // Execute due tasks.
      for (const task of due) {
        this.execute(task);
      }
    }, 1000);
  }

  scheduleRetry(
    org: string,
    subsystem: string,
    type: string,
    maxAttempts: number,
    delayMs: number,
    payload?: any
  ) {
    const task: RetryTask = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      attempt: 1,
      maxAttempts,
      delayMs,
      payload,
      createdAt: Date.now(),
      nextRunAt: Date.now() + delayMs,
    };

    this.tasks.push(task);
    return task;
  }

  private execute(task: RetryTask) {
    const prefix = `[RETRY][${task.subsystem.toUpperCase()}]`;
    console.log(prefix, `Attempt ${task.attempt}/${task.maxAttempts}`, task.payload ?? "");

    // Later: route into unified event bus.
    // For now: console only.

    if (task.attempt < task.maxAttempts) {
      // Reschedule
      const nextTask: RetryTask = {
        ...task,
        attempt: task.attempt + 1,
        nextRunAt: Date.now() + task.delayMs,
      };

      this.tasks.push(nextTask);
    }
  }

  getAll() {
    return [...this.tasks];
  }

  clear() {
    this.tasks = [];
  }
}

export const nucleusRetry = new RetryEngine();
