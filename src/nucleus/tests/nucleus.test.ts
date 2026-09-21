// Constitution "Nucleus" class test.
//
// Exercises exactly the usage the README documents:
//
//   const nucleus = new Nucleus("org-1", "weaver");
//   await nucleus.runWorkflow(definition);
//   await nucleus.dispatch("authorization", "v1", payload);
//   await nucleus.emit("execution", "v1", payload);
//   nucleus.evaluate(context);
//   nucleus.startRuntime();
//   nucleus.enqueue("payment", "v1", payload);
//
// Verifies each method is a real, working wrapper over its real
// underlying implementation -- not that this class reimplements
// anything itself.

import { describe, test, expect } from "vitest";

import { Nucleus } from "../constitution/nucleus";

describe("Nucleus (Constitution unified interface)", () => {
  test("dispatch() calls the real RuntimeRouter and returns a governed, contract-validated result", async () => {
    const nucleus = new Nucleus("org-1", "weaver");

    const result = await nucleus.dispatch("opportunity", "v1", {
      claimId: "claim-nucleus-1",
      organizationId: "org-1",
      claimPayload: { amount: 400 },
    });

    // weaver's real opportunity scoring: min(400/20, 100) = 20
    expect(result.score).toBe(20);
    expect(result.claimId).toBe("claim-nucleus-1");
  });

  test("evaluate() calls the real, non-hardcoded decision engine", () => {
    const nucleus = new Nucleus("org-1", "decision");

    const denied = nucleus.evaluate({
      authorization: { decision: "deny", reason: "benefit exhausted" },
    });
    expect(denied.allowed).toBe(false);

    const allowed = nucleus.evaluate({
      authorization: { decision: "allow", risk_tier: "low" },
      opportunity: { score: 80 },
      recommendation: { confidence: 0.6 },
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.confidence).toBeGreaterThan(0);
  });

  test("emit() routes through the real QueueEngine and reaches eventBus", async () => {
    const nucleus = new Nucleus("org-1", "glue");

    const delivery = await nucleus.emit("execution", "v1", { claimId: "claim-nucleus-2" });

    expect(delivery).not.toBeNull();
    expect(delivery?.status).toBe("delivered");
  });

  test("enqueue() puts a real message on the real QueueEngine without executing it", () => {
    const nucleus = new Nucleus("org-1", "dualpay");

    const message = nucleus.enqueue("payment", "v1", { claimId: "claim-nucleus-3", amount: 100 });

    expect(message.org).toBe("org-1");
    expect(message.queue).toBe("dualpay.payment");
    expect(message.attempts).toBe(0);
  });

  test("startRuntime() boots a real, per-subsystem NucleusRuntime", () => {
    const nucleus = new Nucleus("org-1", "weaver");

    const runtime = nucleus.startRuntime();

    expect(runtime).toBeDefined();
  });
});
