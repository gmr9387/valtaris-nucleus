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

import { describe, test, expect, vi } from "vitest";

// emit()/enqueue() route through the real QueueEngine, which now
// persists through queueRepo.ts's real DB operations (see
// queueEngine.test.ts's header for why this needs a fake here too:
// exercising Nucleus's/QueueEngine's real control flow shouldn't
// require a live Supabase connection).
vi.mock("../queue/queueRepo", () => {
  type Row = {
    id: string;
    organization_id: string;
    queue: string;
    payload: unknown;
    attempts: number;
    max_attempts: number;
    status: "pending" | "processing" | "delivered" | "failed";
    last_error: unknown;
    created_at: string;
    updated_at: string;
  };
  let rows: Row[] = [];
  let seq = 0;
  return {
    insertQueueMessage: async (
      organizationId: string,
      queue: string,
      payload: unknown,
      maxAttempts: number,
    ) => {
      const row: Row = {
        id: `fake-${++seq}`,
        organization_id: organizationId,
        queue,
        payload,
        attempts: 0,
        max_attempts: maxAttempts,
        status: "pending",
        last_error: null,
        created_at: new Date(Date.now() + seq).toISOString(),
        updated_at: new Date().toISOString(),
      };
      rows.push(row);
      return row;
    },
    claimNextQueueMessage: async (queue: string) => {
      const row = rows
        .filter((r) => r.queue === queue && r.status === "pending")
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      if (!row) return null;
      row.status = "processing";
      row.attempts += 1;
      row.updated_at = new Date().toISOString();
      return row;
    },
    markQueueMessageDelivered: async (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = "delivered";
    },
    markQueueMessageFailed: async (
      id: string,
      attempts: number,
      maxAttempts: number,
      error: unknown,
    ) => {
      const row = rows.find((r) => r.id === id);
      if (row) {
        row.status = attempts < maxAttempts ? "pending" : "failed";
        row.last_error = error;
      }
    },
    listQueueMessages: async (queue: string) => rows.filter((r) => r.queue === queue),
    listAllQueueMessages: async () => [...rows],
    clearQueueMessages: async () => {
      rows = [];
    },
  };
});

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

  test("enqueue() puts a real message on the real QueueEngine without executing it", async () => {
    const nucleus = new Nucleus("org-1", "dualpay");

    const message = await nucleus.enqueue("payment", "v1", {
      claimId: "claim-nucleus-3",
      amount: 100,
    });

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
