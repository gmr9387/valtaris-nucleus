// src/nucleus/retry/retryEngine.ts
// Unified constitutional retry engine for the entire Valtaris ecosystem.

import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type RetryPolicy<T = unknown> = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  maxAttempts: number;
  backoffMs: number;
  jitterMs: number;
  handler: () => Promise<T> | T;
  createdAt: number;
};

export type RetryAttempt = {
  id: string;
  policyId: string;
  org: string;
  subsystem: string;
  name: string;
  attempt: number;
  success: boolean;
  timestamp: number;
};

export class RetryEngine {
  private policies: Map<string, RetryPolicy> = new Map();
  private attempts: RetryAttempt[] = [];

  register<T>(
    org: string,
    subsystem: string,
    name: string,
    maxAttempts: number,
    backoffMs: number,
    jitterMs: number,
    handler: RetryPolicy<T>["handler"],
  ) {
    const id = crypto.randomUUID();

    const policy: RetryPolicy<T> = {
      id,
      org,
      subsystem,
      name,
      maxAttempts,
      backoffMs,
      jitterMs,
      handler,
      createdAt: Date.now(),
    };

    this.policies.set(id, policy as RetryPolicy);

    console.log(`[RETRY][${subsystem.toUpperCase()}] Registered policy: ${name}`);

    return policy;
  }

  /**
   * Runs `handler` up to `maxAttempts` times with backoff+jitter between
   * attempts, returning the handler's resolved value on the first
   * attempt that doesn't throw. Every attempt (success or failure) is
   * audited and billed the same way every other engine in this file's
   * family records its work.
   *
   * FIXED (before this ever had a real caller): the original
   * execute(policyId) required a handler returning Promise<boolean> |
   * boolean and could only report success/fail -- it threw away
   * whatever the handler actually produced. That shape doesn't fit any
   * real retry use case in this codebase, where the point of retrying
   * is to get the value back (a kill-switch state, an accumulator
   * fetch), not just to know it eventually succeeded. Replaced with a
   * generic run() that returns T and rethrows the last error once
   * attempts are exhausted, so callers keep their own fail-closed
   * handling in one place instead of RetryEngine silently swallowing
   * the reason for failure.
   */
  async run<T>(
    org: string,
    subsystem: string,
    name: string,
    maxAttempts: number,
    backoffMs: number,
    jitterMs: number,
    handler: () => Promise<T> | T,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const value = await handler();

        this.recordAttempt(org, subsystem, name, attempt, true);
        console.log(`[RETRY][${subsystem.toUpperCase()}] Attempt ${attempt} → SUCCESS`);

        return value;
      } catch (err) {
        lastError = err;

        this.recordAttempt(org, subsystem, name, attempt, false);
        console.log(`[RETRY][${subsystem.toUpperCase()}] Attempt ${attempt} → FAIL`);

        if (attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * jitterMs);
          await new Promise((res) => setTimeout(res, backoffMs + jitter));
        }
      }
    }

    throw lastError;
  }

  private recordAttempt(
    org: string,
    subsystem: string,
    name: string,
    attempt: number,
    success: boolean,
  ) {
    const record: RetryAttempt = {
      id: crypto.randomUUID(),
      policyId: "",
      org,
      subsystem,
      name,
      attempt,
      success,
      timestamp: Date.now(),
    };
    this.attempts.push(record);

    nucleusAudit.log(org, subsystem, `retry.${name}`, "retry-engine", { attempt, success });

    nucleusBilling.recordEvent(
      org,
      subsystem,
      `retry.${name}`,
      1,
      0.001, // $0.001 per retry attempt
      { attempt, success },
    );
  }

  getPolicies() {
    return [...this.policies.values()];
  }

  getAttempts() {
    return [...this.attempts];
  }

  clear() {
    this.policies.clear();
    this.attempts = [];
  }
}

export const nucleusRetry = new RetryEngine();
