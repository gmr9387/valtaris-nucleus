// src/nucleus/events/eventBus.ts
// Unified constitutional event bus for the entire Valtaris ecosystem.
//
// RECONCILED: this used to expose five overlapping ways to listen for
// an event (on, subscribe(subsystem, type, handler), subscribeAll,
// plus a standalone module-level subscribe("*", handler) function) for
// what is really one behavior -- "call this handler when a matching
// event fires." Audited every real call site in the codebase (not just
// grepped for the method name) before touching anything:
//   - on(): zero real callers. Only ever appeared in this file's own
//     doc comment as a hypothetical example. Deleted.
//   - subscribe(subsystem, type, handler): 5 callers, all tests. The
//     `subsystem` argument was always redundant -- every real event
//     type string already carries its subsystem as the first segment
//     ("weaver.opportunity.processed", "guardian.authorization.
//     processed", ...), by the same convention emit() itself relies on
//     to derive `subsystem` when it's only given a type string. Keying
//     storage by subsystem+type separately from type alone bought
//     nothing but a second string to keep in sync.
//   - subscribeAll(handler): rebound `this.publish` to a wrapping
//     closure on every call -- a real bug, not just noise. Two calls
//     to subscribeAll() would nest the wrapping twice; anything that
//     had captured a reference to the original publish() before a
//     subscribeAll() call would silently bypass it.
//   - standalone subscribe("*", handler): 1 real caller
//     (integrations/nucleusMetrics.ts). Existed only because that
//     caller imported a bare function instead of the eventBus object.
//
// One contract now: send with publish() (the low-level primitive) or
// emit() (the convenience wrapper every subsystem runtime already
// uses); listen with subscribe(pattern, handler), where pattern is
// either an exact event type ("weaver.opportunity.processed") or "*"
// for every event. Storage is one map keyed directly by event.type
// plus one array for "*" -- no synthetic composite keys, no
// self-patching.

import type { NucleusEvent } from "./nucleusEvent";
import type { Dynamic } from "../types/dynamic";

export type EventPayload = Dynamic;

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
  private globalHandlers: EventHandler[] = [];
  private events: EventRecord[] = [];

  /**
   * Low-level primitive: every send, however it arrives (publish or
   * emit), ends up here. Records the event, then notifies exact-type
   * subscribers and wildcard subscribers.
   */
  publish(org: string, subsystem: string, type: string, payload: EventPayload) {
    const event: EventRecord = {
      id: crypto.randomUUID(),
      org,
      subsystem,
      type,
      payload,
      timestamp: Date.now(),
    };

    this.events.push(event);

    const prefix = `[EVENT][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Published: ${type}`, payload ?? "");

    for (const handler of this.handlers.get(type) ?? []) {
      try {
        handler(event);
      } catch (err) {
        console.error(prefix, `subscribe("${type}") handler error:`, err);
      }
    }

    for (const handler of this.globalHandlers) {
      try {
        handler(event);
      } catch (err) {
        console.error(prefix, `subscribe("*") handler error:`, err);
      }
    }

    return event;
  }

  /**
   * The convenience "send" API every subsystem runtime actually calls.
   * Two real shapes in this codebase: emit(type, payload) -- subsystem
   * is derived from the type string's first segment -- and
   * emit(event) with a single pre-built NucleusEvent/EventRecord
   * object (e.g. from eventSimulation.ts or the contract adapters).
   */
  emit(typeOrEvent: string | EventRecord | NucleusEvent, maybePayload?: EventPayload) {
    if (typeof typeOrEvent === "string") {
      const type = typeOrEvent;
      const payload = maybePayload;
      const subsystem = type.split(".")[0] || "unknown";
      const org = payload?.organizationId ?? "unknown";
      return this.publish(org, subsystem, type, payload);
    }

    // Single pre-built event object: { type, source, context: { tenantId }, payload }
    const event = typeOrEvent as Dynamic;
    const subsystem = event.source ?? event.subsystem ?? "unknown";
    const org = event.context?.tenantId ?? event.organizationId ?? "unknown";
    return this.publish(org, subsystem, event.type, event.payload);
  }

  /**
   * The one "listen" API. pattern === "*" registers a global handler
   * that sees every event; any other pattern is matched exactly
   * against event.type.
   */
  subscribe(pattern: "*" | string, handler: EventHandler): void {
    const prefix = "[EVENT]";
    if (pattern === "*") {
      this.globalHandlers.push(handler);
      console.log(prefix, "Subscribed to: *");
      return;
    }
    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, []);
    }
    this.handlers.get(pattern)!.push(handler);
    console.log(prefix, `Subscribed to: ${pattern}`);
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
 * Every consumer in this codebase imports this module expecting a
 * named export called "eventBus" (import { eventBus } from
 * ".../eventBus"), but the underlying singleton is "nucleusEventBus".
 * Exporting both names rather than renaming every import site.
 */
export const eventBus = nucleusEventBus;
