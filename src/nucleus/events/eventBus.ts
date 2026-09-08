// src/nucleus/events/eventBus.ts
// Unified constitutional event bus for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type EventPayload = any;

export type EventRecord = {
  id: string;
  org: string;
  subsystem: string;
  type: string;
  payload: EventPayload;
  timestamp: number;
};

export type EventHandler = (event: EventRecord) => void;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private events: EventRecord[] = [];

  publish(org: string, subsystem: string, type: string, payload: EventPayload) {
    const event: EventRecord = {
      id: randomUUID(),
      org,
      subsystem,
      type,
      payload,
      timestamp: Date.now(),
    };

    this.events.push(event);

    const key = `${subsystem}.${type}`;
    const handlers = this.handlers.get(key) || [];

    const prefix = `[EVENT][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Published: ${type}`, payload ?? "");

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error(prefix, `Handler error for ${type}:`, err);
      }
    }

    return event;
  }

  /**
   * FIXED: added -- this method did not previously exist, but every
   * live subsystem runtime (weaver, guardian, glue, dualpay,
   * weaverTelemetry) calls eventBus.emit(type, payload), not
   * publish(org, subsystem, type, payload). Real claims through
   * /api/claim -> osPipeline.ts would throw
   * "eventBus.emit is not a function" on the very first call
   * without this.
   *
   * Every real call site uses a type string shaped like
   * "{subsystem}.{event}.{qualifier}" (e.g. "weaver.opportunity.processed")
   * and a payload that carries organizationId. This shim infers
   * subsystem and org from that existing convention and forwards
   * to publish(), rather than requiring six call sites to be
   * rewritten to a four-argument signature they were never written
   * against.
   */
  emit(type: string, payload: EventPayload) {
    const subsystem = type.split(".")[0] || "unknown";
    const org = payload?.organizationId ?? "unknown";
    return this.publish(org, subsystem, type, payload);
  }

  subscribe(subsystem: string, type: string, handler: EventHandler) {
    const key = `${subsystem}.${type}`;

    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }

    this.handlers.get(key)!.push(handler);

    const prefix = `[EVENT][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Subscribed to: ${type}`);
  }

  /**
   * Subscribe to every event, regardless of subsystem/type.
   * Added because NucleusRuntime needs a global listener
   * ("wire eventBus -> stateEngine") and the key-scoped
   * subscribe() above cannot express that on its own.
   */
  subscribeAll(handler: EventHandler) {
    const originalPublish = this.publish.bind(this);
    this.publish = (org, subsystem, type, payload) => {
      const event = originalPublish(org, subsystem, type, payload);
      handler(event);
      return event;
    };
  }

  getEvents() {
    return [...this.events];
  }

  getEventsBySubsystem(subsystem: string) {
    return this.events.filter((e) => e.subsystem === subsystem);
  }

  getEventsByType(type: string) {
    return this.events.filter((e) => e.type === type);
  }

  clear() {
    this.events = [];
  }
}

export const nucleusEventBus = new EventBus();

/**
 * FIXED: every consumer in this codebase imports this module expecting
 * a named export called "eventBus" (import { eventBus } from
 * ".../eventBus"), but the only export was "nucleusEventBus". Exporting
 * both names here, rather than renaming every import site, since the
 * mismatch was consistent everywhere it was used.
 */
export const eventBus = nucleusEventBus;
