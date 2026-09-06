// services/messaging/messagingService.ts
// Messaging Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusEventBus } from "../../src/nucleus/events/eventBus";
import { nucleusQueue } from "../../src/nucleus/queue/queueEngine";
import { nucleusNetwork } from "../../src/nucleus/network/networkEngine";
import { nucleusState } from "../../src/nucleus/state/stateEngine";
import { nucleusTelemetry } from "../../src/nucleus/telemetry/telemetryEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";

export class MessagingService {
  async publish(org: string, topic: string, payload: any) {
    const eventId = randomUUID();

    nucleusEventBus.emit(org, "messaging", topic, {
      eventId,
      payload,
      timestamp: Date.now(),
    });

    nucleusQueue.enqueue(org, "messaging", topic, {
      eventId,
      payload,
    });

    nucleusNetwork.send(org, "messaging", "subscribers", "event", {
      topic,
      eventId,
      payload,
    });

    nucleusTelemetry.record(org, "messaging", "event.publish", {
      topic,
      eventId,
    });

    nucleusAudit.log(org, "messaging", "event.publish", "messaging-service", {
      topic,
      eventId,
    });

    nucleusBilling.recordEvent(org, "messaging", "event.publish", 1, 0.0015, {
      topic,
    });

    return { eventId, topic };
  }

  async subscribe(org: string, topic: string, subscriber: string) {
    const subId = randomUUID();

    nucleusState.set(org, "messaging", `sub.${subId}`, {
      subId,
      topic,
      subscriber,
      createdAt: Date.now(),
    });

    nucleusAudit.log(org, "messaging", "topic.subscribe", "messaging-service", {
      subId,
      topic,
      subscriber,
    });

    return { subId, topic, subscriber };
  }

  async replay(org: string, topic: string) {
    const events = nucleusQueue.get(org, "messaging", topic);

    nucleusAudit.log(org, "messaging", "topic.replay", "messaging-service", {
      topic,
      count: events.length,
    });

    return events;
  }
}

export const valtarisMessagingService = new MessagingService();
