// src/nucleus/certification/certificationEngine.ts
// Unified constitutional certification engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type CertificationCheck = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  description: string;
  validate: (payload: any) => boolean;
  createdAt: number;
};

export type CertificationResult = {
  id: string;
  checkId: string;
  org: string;
  subsystem: string;
  name: string;
  passed: boolean;
  payload: any;
  timestamp: number;
};

export class CertificationEngine {
  private checks: Map<string, CertificationCheck> = new Map();
  private results: CertificationResult[] = [];

  register(
    org: string,
    subsystem: string,
    name: string,
    description: string,
    validate: (payload: any) => boolean
  ) {
    const id = randomUUID();

    const check: CertificationCheck = {
      id,
      org,
      subsystem,
      name,
      description,
      validate,
      createdAt: Date.now(),
    };

    this.checks.set(id, check);

    console.log(`[CERT][${subsystem.toUpperCase()}] Registered check: ${name}`);

    return check;
  }

  run(checkId: string, payload: any) {
    const check = this.checks.get(checkId);
    if (!check) {
      console.error(`[CERT] Check not found: ${checkId}`);
      return null;
    }

    const passed = check.validate(payload);

    const result: CertificationResult = {
      id: randomUUID(),
      checkId,
      org: check.org,
      subsystem: check.subsystem,
      name: check.name,
      passed,
      payload,
      timestamp: Date.now(),
    };

    this.results.push(result);

    const prefix = `[CERT][${check.subsystem.toUpperCase()}]`;
    console.log(prefix, `${check.name} → ${passed ? "PASSED" : "FAILED"}`);

    // Audit
    nucleusAudit.log(
      check.org,
      check.subsystem,
      `certification.check.${check.name}`,
      "certification-engine",
      { passed, payload }
    );

    // Billing (certification checks cost money)
    nucleusBilling.recordEvent(
      check.org,
      check.subsystem,
      `certification.check.${check.name}`,
      1,
      0.0025, // $0.0025 per certification check
      { passed, payload }
    );

    return result;
  }

  getChecks() {
    return [...this.checks.values()];
  }

  getResults() {
    return [...this.results];
  }

  getResultsByCheck(checkId: string) {
    return this.results.filter((r) => r.checkId === checkId);
  }

  clear() {
    this.checks.clear();
    this.results = [];
  }
}

export const nucleusCertification = new CertificationEngine();
