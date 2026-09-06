// src/nucleus/events/eventBus.ts
// Unified constitutional event bus for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type NucleusEvent = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  version: string;
  payload: any;
  timestamp: number;
};

export class EventBus {
  private listeners: Map<string, ((event: NucleusEvent) => void)[]> = new Map();

  emit(org: string, subsystem: string, type: string, version: string, payload: any) {
    const event: NucleusEvent = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      version,
      payload,
      timestamp: Date.now(),
    };

    const key = `${subsystem}.${type}`;
    const handlers = this.listeners.get(key);

    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventBus] Handler error for ${key}:`, err);
        }
      }
    }

    return event;
  }

  on(subsystem: string, type: string, handler: (event: NucleusEvent) => void) {
    const key = `${subsystem}.${type}`;

    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    this.listeners.get(key)!.push(handler);
  }

  clear() {
    this.listeners.clear();
  }
}

export const nucleusEventBus = new EventBus();
