// src/nucleus/decision/replay.ts
// Full file swap — Decision replay engine

import type { Dynamic } from "../types/dynamic";
export type ReplayEvent = {
  at: number;
  subsystem: string;
  name: string;
  payload: Dynamic;
};

export class Replay {
  private events: ReplayEvent[] = [];

  record(subsystem: string, name: string, payload: Dynamic) {
    this.events.push({
      at: Date.now(),
      subsystem,
      name,
      payload,
    });
  }

  replay() {
    return [...this.events];
  }
}
