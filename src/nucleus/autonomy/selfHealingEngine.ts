// Phase 39 — Self-Healing Engine

import { nucleusRecovery } from "../recovery/recoveryEngine";
import { subsystemHealthEngine } from "./subsystemHealthEngine";

const PLATFORM_ORG = "platform";

export class SelfHealingEngine {
  async heal(subsystem: string) {
    // Ensures the diagnostic + recovery action are registered for this
    // subsystem (see subsystemHealthEngine.ts) even if healAll() runs
    // before any checkAll() has -- idempotent, cheap.
    await subsystemHealthEngine.check(subsystem);

    const recovered = await nucleusRecovery.attemptRecovery(PLATFORM_ORG, subsystem);

    if (recovered === null) {
      return {
        subsystem,
        healed: false,
        reason: "Subsystem already healthy",
      };
    }

    return {
      subsystem,
      healed: recovered,
      reason: recovered
        ? "Subsystem restored to constitutional baseline"
        : "No recovery action succeeded",
    };
  }

  async healAll(subsystems: string[]) {
    return Promise.all(subsystems.map((s) => this.heal(s)));
  }
}

export const selfHealingEngine = new SelfHealingEngine();
