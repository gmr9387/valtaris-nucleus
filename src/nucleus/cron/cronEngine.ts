// src/nucleus/cron/cronEngine.ts
// Unified constitutional distributed cron engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type CronJob = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  intervalMs: number;
  handler: () => Promise<any> | any;
  lastRun: number | null;
  createdAt: number;
};

export type CronExecution = {
  id: string;
  jobId: string;
  org: string;
  subsystem: string;
  name: string;
  status: "success" | "error";
  result?: any;
  error?: any;
  timestamp: number;
};

export class CronEngine {
  private jobs: Map<string, CronJob> = new Map();
  private executions: CronExecution[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();

  register(
    org: string,
    subsystem: string,
    name: string,
    intervalMs: number,
    handler: CronJob["handler"]
  ) {
    const id = randomUUID();

    const job: CronJob = {
      id,
      org,
      subsystem,
      name,
      intervalMs,
      handler,
      lastRun: null,
      createdAt: Date.now(),
    };

    this.jobs.set(id, job);

    console.log(`[CRON][${subsystem.toUpperCase()}] Registered job: ${name}`);

    // Start timer
    const timer = setInterval(() => this.execute(job), intervalMs);
    this.timers.set(id, timer);

    return job;
  }

  private async execute(job: CronJob) {
    const prefix = `[CRON][${job.subsystem.toUpperCase()}]`;

    try {
      const result = await job.handler();

      const execution: CronExecution = {
        id: randomUUID(),
        jobId: job.id,
        org: job.org,
        subsystem: job.subsystem,
        name: job.name,
        status: "success",
        result,
        timestamp: Date.now(),
      };

      this.executions.push(execution);
      job.lastRun = execution.timestamp;

      console.log(prefix, `Executed job: ${job.name}`);

      // Audit
      nucleusAudit.log(
        job.org,
        job.subsystem,
        `cron.job.${job.name}`,
        "cron-engine",
        { result }
      );

      // Billing (cron jobs cost money)
      nucleusBilling.recordEvent(
        job.org,
        job.subsystem,
        `cron.job.${job.name}`,
        1,
        0.003, // $0.003 per cron execution
        { result }
      );

      return execution;
    } catch (err) {
      const execution: CronExecution = {
        id: randomUUID(),
        jobId: job.id,
        org: job.org,
        subsystem: job.subsystem,
        name: job.name,
        status: "error",
        error: err,
        timestamp: Date.now(),
      };

      this.executions.push(execution);
      job.lastRun = execution.timestamp;

      console.error(prefix, `Job failed: ${job.name}`, err);

      // Audit
      nucleusAudit.log(
        job.org,
        job.subsystem,
        `cron.job.${job.name}.failed`,
        "cron-engine",
        { error: err }
      );

      // Billing (failed cron still costs money)
      nucleusBilling.recordEvent(
        job.org,
        job.subsystem,
        `cron.job.${job.name}.failed`,
        1,
        0.003,
        { error: err }
      );

      return execution;
    }
  }

  getJobs() {
    return [...this.jobs.values()];
  }

  getExecutions(jobId?: string) {
    if (!jobId) return [...this.executions];
    return this.executions.filter((e) => e.jobId === jobId);
  }

  clear() {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.jobs.clear();
    this.executions = [];
    this.timers.clear();
  }
}

export const nucleusCron = new CronEngine();
