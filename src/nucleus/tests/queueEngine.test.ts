// Durable QueueEngine test -- proves enqueue/dequeue/deliver/retry
// now persist through queueRepo.ts's DB operations (not an in-memory
// Map) without requiring a live Supabase connection: queueRepo is
// replaced with a small in-memory fake that has the exact same
// contract as the real one (including claim_next_queue_message's
// atomic "pending -> processing, attempts+1" semantics), so this
// exercises QueueEngine's real control flow (retry counting, terminal
// failure, audit/billing hooks) against something that behaves like
// the real store.
import { describe, test, expect, vi, beforeEach } from "vitest";

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
    __reset: () => {
      rows = [];
      seq = 0;
    },
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
      const candidates = rows
        .filter((r) => r.queue === queue && r.status === "pending")
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const row = candidates[0];
      if (!row) return null;
      row.status = "processing";
      row.attempts += 1;
      row.updated_at = new Date().toISOString();
      return row;
    },
    markQueueMessageDelivered: async (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) {
        row.status = "delivered";
        row.updated_at = new Date().toISOString();
      }
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
        row.updated_at = new Date().toISOString();
      }
    },
    listQueueMessages: async (queue: string) =>
      rows
        .filter((r) => r.queue === queue)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    listAllQueueMessages: async () =>
      [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    clearQueueMessages: async () => {
      rows = [];
    },
  };
});

import { QueueEngine } from "../queue/queueEngine";
import * as fakeRepo from "../queue/queueRepo";

const resetFake = () => (fakeRepo as unknown as { __reset: () => void }).__reset();

describe("QueueEngine (durable, DB-backed)", () => {
  beforeEach(() => {
    resetFake();
  });

  test("enqueue() persists a real message with a real id and pending state", async () => {
    const queue = new QueueEngine();
    const message = await queue.enqueue("org-1", "test.queue", { hello: "world" });

    expect(message.id).toBeTruthy();
    expect(message.org).toBe("org-1");
    expect(message.queue).toBe("test.queue");
    expect(message.attempts).toBe(0);
    expect(message.maxAttempts).toBe(3);
  });

  test("dequeue() claims the oldest pending message first (FIFO)", async () => {
    const queue = new QueueEngine();
    const first = await queue.enqueue("org-1", "fifo.queue", { order: 1 });
    await queue.enqueue("org-1", "fifo.queue", { order: 2 });

    const claimed = await queue.dequeue("fifo.queue");
    expect(claimed?.id).toBe(first.id);
    expect(claimed?.attempts).toBe(1); // claim increments attempts
  });

  test("deliver() on success marks the message delivered and calls the handler exactly once", async () => {
    const queue = new QueueEngine();
    await queue.enqueue("org-1", "success.queue", { value: 42 });

    let handlerCalls = 0;
    const delivery = await queue.deliver("success.queue", (msg) => {
      handlerCalls += 1;
      return msg.payload;
    });

    expect(handlerCalls).toBe(1);
    expect(delivery?.status).toBe("delivered");

    const deliveries = await queue.getDeliveries("success.queue");
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe("delivered");
  });

  test("deliver() on failure retries until maxAttempts, then terminally fails", async () => {
    const queue = new QueueEngine();
    await queue.enqueue("org-1", "retry.queue", { value: 1 }, 2); // maxAttempts=2

    // Attempt 1: fails, attempts(1) < maxAttempts(2) -> goes back to pending
    const first = await queue.deliver("retry.queue", () => {
      throw new Error("boom");
    });
    expect(first?.status).toBe("failed"); // this delivery attempt failed
    let pending = await queue.getQueue("retry.queue");
    expect(pending).toHaveLength(1); // still pending, not terminal yet

    // Attempt 2: fails again, attempts(2) >= maxAttempts(2) -> terminal failed
    const second = await queue.deliver("retry.queue", () => {
      throw new Error("boom again");
    });
    expect(second?.status).toBe("failed");
    pending = await queue.getQueue("retry.queue");
    expect(pending).toHaveLength(0); // no longer pending -- terminally failed

    const deliveries = await queue.getDeliveries("retry.queue");
    expect(deliveries).toHaveLength(1); // one terminal row, not a per-attempt log
    expect(deliveries[0].status).toBe("failed");
  });

  test("getQueue() only returns pending/processing messages, not delivered ones", async () => {
    const queue = new QueueEngine();
    await queue.enqueue("org-1", "mixed.queue", { a: 1 });
    await queue.enqueue("org-1", "mixed.queue", { a: 2 });
    await queue.deliver("mixed.queue", () => "ok");

    const remaining = await queue.getQueue("mixed.queue");
    expect(remaining).toHaveLength(1);
  });

  test("clear() removes every message across every queue", async () => {
    const queue = new QueueEngine();
    await queue.enqueue("org-1", "a.queue", {});
    await queue.enqueue("org-1", "b.queue", {});

    await queue.clear();

    expect(await queue.getQueue("a.queue")).toHaveLength(0);
    expect(await queue.getQueue("b.queue")).toHaveLength(0);
  });

  test("dequeue() on an empty queue returns null rather than throwing", async () => {
    const queue = new QueueEngine();
    const result = await queue.dequeue("nothing.here");
    expect(result).toBeNull();
  });
});
