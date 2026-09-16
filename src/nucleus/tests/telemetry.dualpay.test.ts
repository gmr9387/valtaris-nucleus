// Phase 17 — DualPay telemetry constitutional test

import { describe, test, expect } from "vitest";

import { DualPayRuntime } from "../subsystems/dualpay/dualPayRuntime";
import { eventBus } from "../events/eventBus";

describe("Telemetry — DualPay", () => {
  test("publishes an event when a payment is processed", () => {
    return new Promise<void>((resolve, reject) => {
      const base = {
        claimId: "t-dualpay-1",
        organizationId: "org-telemetry",
        execution: { status: "executed" },
        authorization: { decision: "allow" },
        recommendation: { confidence: 0.9 },
      };

      eventBus.subscribe("dualpay.payment.processed", (signal) => {
        try {
          expect(signal.subsystem).toBe("dualpay");
          expect(signal.org).toBe("org-telemetry");
          expect(signal.payload.claimId).toBe("t-dualpay-1");
          expect(signal.payload.organizationId).toBe("org-telemetry");
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      DualPayRuntime.handle("payment", base);
    });
  });
});
