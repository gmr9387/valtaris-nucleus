// src/nucleus/queue/queueEngine.ts
// Unified constitutional distributed queue engine for the entire Valtaris ecosystem.
//
// FIXED: every message used to live only in a process-local
// Map<string, QueueMessage[]> -- a restart, deploy, or crash silently
// dropped anything still queued or mid-retry, with no trace it ever
// existed. Now backed by nucleus_queue_messages (supabase/migrations/
// 20260922000000_nucleus_queue.sql) via queueRepo.ts: enqueue/dequeue/
// deliver/getQueue/getDeliveries/clear all persist through real DB
// operations instead of in-memory state. This necessarily makes every
// method async (it wasn't before) -- callers (TelemetryAdapter,
// Scheduler, Nucleus.enqueue()) already either awaited or returned
// these calls directly, so this is a type-level change, not a
// behavioral one for them.

import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";
import {
  insertQueueMessage,
  claimNextQueueMessage,
  markQueueMessageDelivered,
  markQueueMessageFailed,
  listQueueMessages,
  listAllQueueMessages,
  clearQueueMessages,
  type QueueMessageRow,
} from "./queueRepo";
import type { Dynamic } from "../types/dynamic";

export type QueueMessage = {
  id: string;
  org: string;
  queue: string;
  payload: Dynamic;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
};

export type QueueDelivery = {
  id: string;
  messageId: string;
  queue: string;
  status: "delivered" | "failed";
  error?: Dynamic;
  timestamp: number;
};

function toQueueMessage(row: QueueMessageRow): QueueMessage {
  return {
    id: row.id,
    org: row.organization_id,
    queue: row.queue,
    payload: row.payload,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export class QueueEngine {
  async enqueue(
    org: string,
    queue: string,
    payload: Dynamic,
    maxAttempts: number = 3,
  ): Promise<QueueMessage> {
    const row = await insertQueueMessage(org, queue, payload, maxAttempts);
    const message = toQueueMessage(row);

    console.log(`[QUEUE][${queue.toUpperCase()}] Enqueued message`);

    // Audit
    nucleusAudit.log(org, queue, `queue.enqueue`, "queue-engine", { payload });

    // Billing (enqueue costs money)
    nucleusBilling.recordEvent(
      org,
      queue,
      `queue.enqueue`,
      1,
      0.001, // $0.001 per enqueue
      { payload },
    );

    return message;
  }

  async dequeue(queue: string): Promise<QueueMessage | null> {
    const row = await claimNextQueueMessage(queue);
    if (!row) return null;
    return toQueueMessage(row);
  }

  async deliver(
    queue: string,
    handler: (msg: QueueMessage) => Promise<Dynamic> | Dynamic,
  ): Promise<QueueDelivery | null> {
    const message = await this.dequeue(queue);
    if (!message) return null;

    try {
      await handler(message);
      await markQueueMessageDelivered(message.id);

      const delivery: QueueDelivery = {
        id: crypto.randomUUID(),
        messageId: message.id,
        queue,
        status: "delivered",
        timestamp: Date.now(),
      };

      console.log(`[QUEUE][${queue.toUpperCase()}] Delivered message`);

      // Audit
      nucleusAudit.log(message.org, queue, `queue.deliver`, "queue-engine", {
        messageId: message.id,
      });

      // Billing (delivery costs money)
      nucleusBilling.recordEvent(
        message.org,
        queue,
        `queue.deliver`,
        1,
        0.002, // $0.002 per delivery
        { messageId: message.id },
      );

      return delivery;
    } catch (err) {
      // dequeue() already incremented attempts via claimNextQueueMessage();
      // this just decides whether the row goes back to 'pending' (retry
      // on a future poll) or terminal 'failed'.
      await markQueueMessageFailed(
        message.id,
        message.attempts,
        message.maxAttempts,
        err as Dynamic,
      );

      const delivery: QueueDelivery = {
        id: crypto.randomUUID(),
        messageId: message.id,
        queue,
        status: "failed",
        error: err as Dynamic,
        timestamp: Date.now(),
      };

      console.error(`[QUEUE][${queue.toUpperCase()}] Delivery failed`, err);
      if (message.attempts < message.maxAttempts) {
        console.log(`[QUEUE][${queue.toUpperCase()}] Retrying message`);
      }

      // Audit
      nucleusAudit.log(message.org, queue, `queue.delivery.failed`, "queue-engine", {
        messageId: message.id,
        error: err,
      });

      // Billing (failed delivery still costs money)
      nucleusBilling.recordEvent(message.org, queue, `queue.delivery.failed`, 1, 0.002, {
        messageId: message.id,
      });

      return delivery;
    }
  }

  async getQueue(queue: string): Promise<QueueMessage[]> {
    const rows = await listQueueMessages(queue);
    return rows
      .filter((r) => r.status === "pending" || r.status === "processing")
      .map(toQueueMessage);
  }

  async getDeliveries(queue?: string): Promise<QueueDelivery[]> {
    const rows = queue ? await listQueueMessages(queue) : await listAllQueueMessages();
    return rows
      .filter((r) => r.status === "delivered" || r.status === "failed")
      .map((r) => ({
        id: r.id,
        messageId: r.id,
        queue: r.queue,
        status: r.status as "delivered" | "failed",
        error: r.last_error ?? undefined,
        timestamp: new Date(r.updated_at).getTime(),
      }));
  }

  async clear(): Promise<void> {
    await clearQueueMessages();
  }
}

export const nucleusQueue = new QueueEngine();
