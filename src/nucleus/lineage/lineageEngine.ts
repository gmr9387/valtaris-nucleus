// Phase 21 — Lineage Engine

import { NucleusEvent } from "../events/nucleusEvent";
import { lineageStore } from "./lineageStore";
import { LineageEntry } from "./lineageEntry";

export class LineageEngine {
  recordEvent(event: NucleusEvent, resourceId?: string, resourceType?: string) {
    const entry: LineageEntry = {
      id: crypto.randomUUID(),

      eventType: event.type,
      eventVersion: event.version,
      payload: event.payload,

      identity: event.context,

      resourceId,
      resourceType,

      timestamp: new Date().toISOString(),
    };

    lineageStore.record(entry);
  }

  list(): LineageEntry[] {
    return lineageStore.list();
  }
}

export const lineageEngine = new LineageEngine();
