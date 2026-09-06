// src/nucleus/identity/identityEngine.ts
// Unified constitutional identity engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type IdentityRecord = {
  id: string;
  org: string;
  subsystem: string;
  name: string;
  metadata: Record<string, any>;
  createdAt: number;
};

export class IdentityEngine {
  private identities: Map<string, IdentityRecord> = new Map();

  create(org: string, subsystem: string, name: string, metadata: Record<string, any>) {
    const id = randomUUID();

    const identity: IdentityRecord = {
      id,
      org,
      subsystem,
      name,
      metadata,
      createdAt: Date.now(),
    };

    this.identities.set(id, identity);

    console.log(`[IDENTITY][${subsystem.toUpperCase()}] Created: ${name}`);

    nucleusAudit.log(org, subsystem, `identity.create.${name}`, "identity-engine", { metadata });
    nucleusBilling.recordEvent(org, subsystem, `identity.create.${name}`, 1, 0.002, { metadata });

    return identity;
  }

  get(org?: string, subsystem?: string) {
    return [...this.identities.values()].filter((i) => {
      if (org && i.org !== org) return false;
      if (subsystem && i.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    this.identities.clear();
  }
}

export const nucleusIdentity = new IdentityEngine();
