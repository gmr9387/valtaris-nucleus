// Phase 21 — Lineage Store

import { LineageEntry } from "./lineageEntry";

export class LineageStore {
  private entries: LineageEntry[] = [];

  record(entry: LineageEntry) {
    this.entries.push(entry);
  }

  list(): LineageEntry[] {
    return [...this.entries];
  }

  listByResource(resourceId: string): LineageEntry[] {
    return this.entries.filter((e) => e.resourceId === resourceId);
  }

  listByActor(actorId: string): LineageEntry[] {
    return this.entries.filter((e) => e.identity.actorId === actorId);
  }

  listBySubsystem(subsystem: string): LineageEntry[] {
    return this.entries.filter((e) => e.identity.subsystem === subsystem);
  }

  listByCapability(capability: string): LineageEntry[] {
    return this.entries.filter((e) => e.identity.capability === capability);
  }
}

export const lineageStore = new LineageStore();
