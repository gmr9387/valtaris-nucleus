// src/nucleus/config/configEngine.ts
// Unified constitutional config engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type ConfigRecord = {
  id: string;
  org: string;
  subsystem: string;
  key: string;
  value: any;
  version: number;
  createdAt: number;
};

export class ConfigEngine {
  private configs: Map<string, ConfigRecord> = new Map();

  private makeKey(org: string, subsystem: string, key: string) {
    return `${org}.${subsystem}.${key}`;
  }

  set(org: string, subsystem: string, key: string, value: any) {
    const compositeKey = this.makeKey(org, subsystem, key);
    const existing = this.configs.get(compositeKey);

    const record: ConfigRecord = {
      id: existing?.id ?? randomUUID(),
      org,
      subsystem,
      key,
      value,
      version: existing ? existing.version + 1 : 1,
      createdAt: Date.now(),
    };

    this.configs.set(compositeKey, record);

    console.log(`[CONFIG][${subsystem.toUpperCase()}] Set ${key}`);

    nucleusAudit.log(org, subsystem, `config.set.${key}`, "config-engine", {
      value,
      version: record.version,
    });

    nucleusBilling.recordEvent(
      org,
      subsystem,
      `config.set.${key}`,
      1,
      0.0015,
      { version: record.version }
    );

    return record;
  }

  get(org: string, subsystem: string, key: string) {
    return this.configs.get(this.makeKey(org, subsystem, key)) ?? null;
  }

  getAll(org?: string, subsystem?: string) {
    return [...this.configs.values()].filter((c) => {
      if (org && c.org !== org) return false;
      if (subsystem && c.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    this.configs.clear();
  }
}

export const nucleusConfig = new ConfigEngine();
