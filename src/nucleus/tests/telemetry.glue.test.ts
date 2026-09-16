// Phase 17 — Glue telemetry constitutional test

import { describe, test, expect } from "vitest";

import { GlueRuntime } from "../subsystems/glue/glueRuntime";
import { eventBus } from "../events/eventBus";

describe("Telemetry — Glue", () => {
  test("publishes an event when an execution is processed", () => {
    return new Promise<void>((resolve, reject) => {
      const base = {
        claimId: "t-glue-1",
        organizationId: "org-telemetry",
        authorization: { decision: "allow" },
        recommendation: { action: "approve", confidence: 0.9 },
      };

      eventBus.subscribe("glue.execution.processed", (signal) => {
        try {
          expect(signal.subsystem).toBe("glue");
          expect(signal.org).toBe("org-telemetry");
          expect(signal.payload.claimId).toBe("t-glue-1");
          expect(signal.payload.organizationId).toBe("org-telemetry");
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      GlueRuntime.handle("execution", base);
    });
  });
});
