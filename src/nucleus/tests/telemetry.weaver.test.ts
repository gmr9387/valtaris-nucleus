// Phase 17 — Weaver telemetry constitutional test

import { describe, test, expect } from "vitest";

import { WeaverRuntime } from "../subsystems/weaver/weaverRuntime";
import { eventBus } from "../events/eventBus";

describe("Telemetry — Weaver", () => {
  test("publishes events for opportunity and recommendation", () => {
    return new Promise<void>((resolve, reject) => {
      const base = {
        claimId: "t-weaver-1",
        organizationId: "org-telemetry",
        claimPayload: { amount: 500 },
      };

      let received = 0;
      const done = () => {
        received++;
        if (received === 2) resolve();
      };

      eventBus.subscribe("weaver", "weaver.opportunity.processed", (signal) => {
        try {
          expect(signal.subsystem).toBe("weaver");
          expect(signal.org).toBe("org-telemetry");
          expect(signal.payload.claimId).toBe("t-weaver-1");
          expect(signal.payload.organizationId).toBe("org-telemetry");
          done();
        } catch (err) {
          reject(err);
        }
      });

      eventBus.subscribe("weaver", "weaver.recommendation.processed", (signal) => {
        try {
          expect(signal.subsystem).toBe("weaver");
          expect(signal.org).toBe("org-telemetry");
          expect(signal.payload.claimId).toBe("t-weaver-1");
          expect(signal.payload.organizationId).toBe("org-telemetry");
          done();
        } catch (err) {
          reject(err);
        }
      });

      WeaverRuntime.handle("opportunity", base);
      WeaverRuntime.handle("recommendation", base);
    });
  });
});
