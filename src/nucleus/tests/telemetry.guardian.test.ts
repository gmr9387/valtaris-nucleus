// Phase 17 — Guardian telemetry constitutional test

import { describe, test, expect } from "vitest";

import { GuardianRuntime } from "../subsystems/guardian/guardianRuntime";
import { eventBus } from "../events/eventBus";

describe("Telemetry — Guardian", () => {
  test("publishes an event when an authorization is processed", () => {
    return new Promise<void>((resolve, reject) => {
      const base = {
        claimId: "t-guardian-1",
        organizationId: "org-telemetry",
        opportunity: { score: 80 },
        recommendation: { action: "approve", confidence: 0.8 },
      };

      eventBus.subscribe("guardian.authorization.processed", (signal) => {
        try {
          expect(signal.subsystem).toBe("guardian");
          expect(signal.org).toBe("org-telemetry");
          expect(signal.payload.claimId).toBe("t-guardian-1");
          expect(signal.payload.organizationId).toBe("org-telemetry");
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      GuardianRuntime.handle("authorization", base);
    });
  });
});
