// src/nucleus/retry/retryEngine.ts
// Unified constitutional retry engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type RetryPolicy = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  maxAttempts: number;
  backoffMs: number;
  jitterMs: number;
  handler: () => Promise<boolean> | boolean;
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

  register(
    org: string,
    subsystem: string,
    name: string,
    maxAttempts: number,
    backoffMs: number,
    jitterMs: number,
    handler: RetryPolicy["handler"]
  ) {
    const id = randomUUID();

    const policy: RetryPolicy = {
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

    this.policies.set(id, policy);

    console.log(`[RETRY][${subsystem.toUpperCase()}] Registered policy: ${name}`);

    return policy;
  }

  async execute(policyId: string) {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      const success = await policy.handler();

      const record: RetryAttempt = {
        id: randomUUID(),
        policyId,
        org: policy.org,
        subsystem: policy.subsystem,
        name: policy.name,
        attempt,
        success,
        timestamp: Date.now(),
      };

      this.attempts.push(record);

      console.log(
        `[RETRY][${policy.subsystem.toUpperCase()}] Attempt ${attempt} → ${success ? "SUCCESS" : "FAIL"}`
      );

      // Audit
      nucleusAudit.log(
        policy.org,
        policy.subsystem,
        `retry.${policy.name}`,
        "retry-engine",
        { attempt, success }
      );

      // Billing
      nucleusBilling.recordEvent(
        policy.org,
        policy.subsystem,
        `retry.${policy.name}`,
        1,
        0.001, // $0.001 per retry attempt
        { attempt, success }
      );

      if (success) return true;

      const jitter = Math.floor(Math.random() * policy.jitterMs);
      await new Promise((res) => setTimeout(res, policy.backoffMs + jitter));
    }

    return false;
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
