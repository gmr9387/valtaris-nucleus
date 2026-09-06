// src/nucleus/os/osEngine.ts
// Unified constitutional OS engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusHealth } from "../health/healthEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type SubsystemRegistration = {
  id: string;
  org: string;
  name: string;
  description: string;
  capabilities: string[];
  createdAt: number;
};

export type SubsystemStatus = {
  id: string;
  subsystemId: string;
  org: string;
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
};

export class OSEngine {
  private subsystems: Map<string, SubsystemRegistration> = new Map();
  private statuses: SubsystemStatus[] = [];

  registerSubsystem(
    org: string,
    name: string,
    description: string,
    capabilities: string[]
  ) {
    const id = randomUUID();

    const subsystem: SubsystemRegistration = {
      id,
      org,
      name,
      description,
      capabilities,
      createdAt: Date.now(),
    };

    this.subsystems.set(id, subsystem);

    console.log(`[OS] Registered subsystem: ${name}`);

    // Audit
    nucleusAudit.log(
      org,
      name,
      `os.register`,
      "os-engine",
      { description, capabilities }
    );

    // Billing
    nucleusBilling.recordEvent(
      org,
      name,
      `os.register`,
      1,
      0.003, // $0.003 per subsystem registration
      { capabilities }
    );

    return subsystem;
  }

  async checkSubsystem(org: string, name: string) {
    const subsystem = [...this.subsystems.values()].find(
      (s) => s.org === org && s.name === name
    );

    if (!subsystem) {
      console.error(`[OS] Subsystem not found: ${name}`);
      return null;
    }

    const health = await nucleusHealth.check(org, name);

    const status: SubsystemStatus = {
      id: randomUUID(),
      subsystemId: subsystem.id,
      org,
      name,
      status: health.status,
      timestamp: Date.now(),
    };

    this.statuses.push(status);

    console.log(`[OS] Subsystem ${name} → ${health.status.toUpperCase()}`);

    // Audit
    nucleusAudit.log(
      org,
      name,
      `os.status`,
      "os-engine",
      { status: health.status }
    );

    // Billing
    nucleusBilling.recordEvent(
      org,
      name,
      `os.status`,
      1,
      0.002, // $0.002 per subsystem status check
      { status: health.status }
    );

    return status;
  }

  getSubsystems() {
    return [...this.subsystems.values()];
  }

  getStatuses(org?: string, name?: string) {
    return this.statuses.filter((s) => {
      if (org && s.org !== org) return false;
      if (name && s.name !== name) return false;
      return true;
    });
  }

  clear() {
    this.subsystems.clear();
    this.statuses = [];
  }
}

export const nucleusOS = new OSEngine();
