// src/nucleus/keys/keyEngine.ts
// Unified constitutional key engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import crypto from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type KeyRecord = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  key: string;
  createdAt: number;
  revoked: boolean;
};

export class KeyEngine {
  private keys: Map<string, KeyRecord> = new Map();

  generate(org: string, subsystem: string, name: string) {
    const id = randomUUID();
    const key = crypto.randomBytes(32).toString("hex");

    const record: KeyRecord = {
      id,
      org,
      subsystem,
      name,
      key,
      createdAt: Date.now(),
      revoked: false,
    };

    this.keys.set(id, record);

    console.log(`[KEYS][${subsystem.toUpperCase()}] Generated key: ${name}`);

    nucleusAudit.log(org, subsystem, `keys.generate.${name}`, "key-engine", {});
    nucleusBilling.recordEvent(org, subsystem, `keys.generate.${name}`, 1, 0.004, {});

    return record;
  }

  revoke(keyId: string) {
    const record = this.keys.get(keyId);
    if (!record) return null;

    record.revoked = true;

    console.log(`[KEYS][${record.subsystem.toUpperCase()}] Revoked key: ${record.name}`);

    nucleusAudit.log(record.org, record.subsystem, `keys.revoke.${record.name}`, "key-engine", {});
    nucleusBilling.recordEvent(record.org, record.subsystem, `keys.revoke.${record.name}`, 1, 0.002, {});

    return record;
  }

  getKeys(org?: string, subsystem?: string) {
    return [...this.keys.values()].filter((k) => {
      if (org && k.org !== org) return false;
      if (subsystem && k.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    this.keys.clear();
  }
}

export const nucleusKeys = new KeyEngine();
