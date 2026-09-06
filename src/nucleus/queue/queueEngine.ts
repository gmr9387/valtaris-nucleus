// src/nucleus/queue/queueEngine.ts
// Unified constitutional queue engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type QueueJob = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  payload?: any;
  createdAt: number;
  attempts: number;
  maxAttempts: number;
};

export class QueueEngine {
  private queue: QueueJob[] = [];
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    this.start();
  }

  private start() {
    if (this.interval) return;

    // Process queue every second.
    this.interval = setInterval(() => {
      if (this.queue.length === 0) return;

      const job = this.queue.shift();
      if (!job) return;

      this.execute(job);
    }, 1000);
  }

  enqueue(
    org: string,
    subsystem: string,
    type: string,
    payload?: any,
    maxAttempts: number = 3
  ) {
    const job: QueueJob = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      payload,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts,
    };

    this.queue.push(job);
    return job;
  }

  private execute(job: QueueJob) {
    job.attempts++;

    const prefix = `[QUEUE][${job.subsystem.toUpperCase()}]`;
    console.log(prefix, `Executing job ${job.type}`, job.payload ?? "");

    // Later: route into unified event bus.
    // For now: console only.

    if (job.attempts < job.maxAttempts) {
      // Re-enqueue failed jobs automatically.
      this.queue.push(job);
    }
  }

  getAll() {
    return [...this.queue];
  }

  clear() {
    this.queue = [];
  }
}

export const nucleusQueue = new QueueEngine();
