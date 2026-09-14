// Phase 44 — CI Runner

import { ciManifest } from "./ciManifest";
import { ciState } from "./ciState";
import { ciSuites } from "./ciSuites";
import type { Dynamic } from "../types/dynamic";

export class CIRunner {
  async run() {
    if (!ciManifest.enabled) {
      throw new Error("CI disabled by manifest");
    }

    for (const suite of ciManifest.suites) {
      const fn = (ciSuites as Dynamic)[suite];
      if (!fn) throw new Error(`Unknown CI suite: ${suite}`);

      await fn();
      ciState.executedSuites.push(suite);
    }

    ciState.completed = true;
    ciState.lastExecutedAt = new Date().toISOString();

    return {
      completed: ciState.completed,
      executedSuites: ciState.executedSuites,
      lastExecutedAt: ciState.lastExecutedAt,
    };
  }
}

export const ciRunner = new CIRunner();
