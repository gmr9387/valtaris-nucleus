// src/nucleus/identity/orgEngine.ts
// Unified constitutional org engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type OrgRecord = {
  id: string;
  org: string;
  displayName: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
};

export class OrgEngine {
  private orgs: Map<string, OrgRecord> = new Map();

  register(org: string, displayName: string, metadata: Record<string, any> = {}) {
    const record: OrgRecord = {
      id: randomUUID(),
      org,
      displayName,
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.orgs.set(org, record);

    console.log(`[ORG][${org.toUpperCase()}] Registered org: ${displayName}`);

    return record;
  }

  update(org: string, metadata: Record<string, any>) {
    const existing = this.orgs.get(org);
    if (!existing) return null;

    const updated: OrgRecord = {
      ...existing,
      metadata: { ...existing.metadata, ...metadata },
      updatedAt: Date.now(),
    };

    this.orgs.set(org, updated);

    console.log(`[ORG][${org.toUpperCase()}] Updated org metadata`);

    return updated;
  }

  get(org: string) {
    return this.orgs.get(org) ?? null;
  }

  exists(org: string) {
    return this.orgs.has(org);
  }

  getAll() {
    return [...this.orgs.values()];
  }

  delete(org: string) {
    return this.orgs.delete(org);
  }

  clear() {
    this.orgs.clear();
  }
}

export const nucleusOrg = new OrgEngine();
