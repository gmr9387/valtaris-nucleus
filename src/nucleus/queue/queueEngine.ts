// src/nucleus/queue/queueEngine.ts
// Unified constitutional distributed queue engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type QueueMessage = {
  id: string;
  org: string;
  queue: string;
  payload: any;
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
  error?: any;
  timestamp: number;
};

export class QueueEngine {
  private queues: Map<string, QueueMessage[]> = new Map();
  private deliveries: QueueDelivery[] = [];

  enqueue(
    org: string,
    queue: string,
    payload: any,
    maxAttempts: number = 3
  ) {
    const message: QueueMessage = {
      id: randomUUID(),
      org,
      queue,
      payload,
      attempts: 0,
      maxAttempts,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (!this.queues.has(queue)) {
      this.queues.set(queue, []);
    }

    this.queues.get(queue)!.push(message);

    console.log(`[QUEUE][${queue.toUpperCase()}] Enqueued message`);

    // Audit
    nucleusAudit.log(
      org,
      queue,
      `queue.enqueue`,
      "queue-engine",
      { payload }
    );

    // Billing (enqueue costs money)
    nucleusBilling.recordEvent(
      org,
      queue,
      `queue.enqueue`,
      1,
      0.001, // $0.001 per enqueue
      { payload }
    );

    return message;
  }

  dequeue(queue: string) {
    const messages = this.queues.get(queue);
    if (!messages || messages.length === 0) return null;

    const message = messages.shift()!;
    return message;
  }

  async deliver(
    queue: string,
    handler: (msg: QueueMessage) => Promise<any> | any
  ) {
    const message = this.dequeue(queue);
    if (!message) return null;

    message.attempts++;
    message.updatedAt = Date.now();

    try {
      await handler(message);

      const delivery: QueueDelivery = {
        id: randomUUID(),
        messageId: message.id,
        queue,
        status: "delivered",
        timestamp: Date.now(),
      };

      this.deliveries.push(delivery);

      console.log(`[QUEUE][${queue.toUpperCase()}] Delivered message`);

      // Audit
      nucleusAudit.log(
        message.org,
        queue,
        `queue.deliver`,
        "queue-engine",
        { messageId: message.id }
      );

      // Billing (delivery costs money)
      nucleusBilling.recordEvent(
        message.org,
        queue,
        `queue.deliver`,
        1,
        0.002, // $0.002 per delivery
        { messageId: message.id }
      );

      return delivery;
    } catch (err) {
      const delivery: QueueDelivery = {
        id: randomUUID(),
        messageId: message.id,
        queue,
        status: "failed",
        error: err,
        timestamp: Date.now(),
      };

      this.deliveries.push(delivery);

      console.error(`[QUEUE][${queue.toUpperCase()}] Delivery failed`, err);

      // Retry logic
      if (message.attempts < message.maxAttempts) {
        console.log(`[QUEUE][${queue.toUpperCase()}] Retrying message`);
        this.queues.get(queue)!.push(message);
      }

      // Audit
      nucleusAudit.log(
        message.org,
        queue,
        `queue.delivery.failed`,
        "queue-engine",
        { messageId: message.id, error: err }
      );

      // Billing (failed delivery still costs money)
      nucleusBilling.recordEvent(
        message.org,
        queue,
        `queue.delivery.failed`,
        1,
        0.002,
        { messageId: message.id }
      );

      return delivery;
    }
  }

  getQueue(queue: string) {
    return this.queues.get(queue) ?? [];
  }

  getDeliveries(queue?: string) {
    if (!queue) return [...this.deliveries];
    return this.deliveries.filter((d) => d.queue === queue);
  }

  clear() {
    this.queues.clear();
    this.deliveries = [];
  }
}

export const nucleusQueue = new QueueEngine();
