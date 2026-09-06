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

  subscribe(subsystem: string, type: string, handler: EventHandler) {
    const key = `${subsystem}.${type}`;

    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }

    this.handlers.get(key)!.push(handler);

    const prefix = `[EVENT][${subsystem.toUpperCase()}]`;
    console.log(prefix, `Subscribed to: ${type}`);
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
