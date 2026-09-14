// src/nucleus/integrations/nucleusMetrics.ts

/**
 * Nucleus Metrics Aggregator
 *
 * Constitutional role:
 * Nucleus = KNOW
 *
 * This integration computes rolling metrics for:
 *   - event throughput
 *   - subsystem uptime
 *   - anomaly frequency
 *   - opportunity → authorization → execution pipeline latency
 *   - DualPay domain-specific signal rates
 *
 * Metrics are read-only.
 * No execution.
 * No authorization.
 * No domain logic.
 */

import { subscribe, type EventRecord } from "../events/eventBus";

const metrics = {
  eventCount: 0,
  eventsPerMinute: 0,
  anomaliesDetected: 0,
  opportunitiesDetected: 0,
  authorizationsIssued: 0,
  executionsCompleted: 0,
  dualpaySignals: 0,
  pipelineLatencyMs: [] as number[],
};

let lastMinuteEventCount = 0;
let lastEventTimestamp: number | null = null;

export function startNucleusMetrics() {
  // Track all events
  subscribe("*", (event: EventRecord) => {
    metrics.eventCount++;

    // Throughput tracking
    lastMinuteEventCount++;

    // Pipeline latency tracking
    if (event.type === "opportunity.detected") {
      lastEventTimestamp = Date.now();
      metrics.opportunitiesDetected++;
    }

    if (event.type === "action.authorized") {
      metrics.authorizationsIssued++;
    }

    if (event.type === "execution.completed") {
      metrics.executionsCompleted++;

      if (lastEventTimestamp) {
        const latency = Date.now() - lastEventTimestamp;
        metrics.pipelineLatencyMs.push(latency);
        lastEventTimestamp = null;
      }
    }

    // Anomaly tracking
    if (event.type === "anomaly.detected") {
      metrics.anomaliesDetected++;
    }

    // DualPay domain-specific signals
    if (
      event.type.startsWith("dualpay.reimbursement") ||
      event.type.startsWith("dualpay.remittance") ||
      event.type.startsWith("dualpay.claim")
    ) {
      metrics.dualpaySignals++;
    }
  });

  // Compute events-per-minute
  setInterval(() => {
    metrics.eventsPerMinute = lastMinuteEventCount;
    lastMinuteEventCount = 0;
  }, 60_000);

  console.log("[Nucleus] Metrics Aggregator Active.");
}

/**
 * Exported metrics snapshot
 */
export function getMetricsSnapshot() {
  return {
    ...metrics,
    averagePipelineLatencyMs:
      metrics.pipelineLatencyMs.length > 0
        ? metrics.pipelineLatencyMs.reduce((a, b) => a + b, 0) / metrics.pipelineLatencyMs.length
        : 0,
  };
}
