// src/nucleus/cron/cronEngine.ts
// Unified constitutional cron engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type CronJob = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  intervalMs: number; // how often it runs
  payload?: any;
  lastRunAt: number | null;
  createdAt: number;
};

export class CronEngine {
  private jobs: CronJob[] = [];
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    this.start();
  }

  private start() {
    if (this.interval) return;

    // Check cron jobs every second.
    this.interval = setInterval(() => {
      const now = Date.now();

      for (const job of this.jobs) {
        const shouldRun =
          job.lastRunAt === null ||
          now - job.lastRunAt >= job.intervalMs;

        if (shouldRun) {
          this.execute(job);
        }
      }
    }, 1000);
  }

  register(
    org: string,
    subsystem: string,
    type: string,
    intervalMs: number,
    payload?: any
  ) {
    const job: CronJob = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      intervalMs,
      payload,
      lastRunAt: null,
      createdAt: Date.now(),
    };

    this.jobs.push(job);
    return job;
  }

  private execute(job: CronJob) {
    job.lastRunAt = Date.now();

    const prefix = `[CRON][${job.subsystem.toUpperCase()}]`;
    console.log(prefix, `Running ${job.type}`, job.payload ?? "");

    // Later: route into unified event bus.
    // For now: console only.
  }

  getAll() {
    return [...this.jobs];
  }

  clear() {
    this.jobs = [];
  }
}

export const nucleusCron = new CronEngine();
