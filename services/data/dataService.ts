// services/data/dataService.ts
// Data Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusState } from "../../src/nucleus/state/stateEngine";
import { nucleusPipeline } from "../../src/nucleus/pipelines/pipelineEngine";
import { nucleusCluster } from "../../src/nucleus/cluster/clusterEngine";
import { nucleusFederation } from "../../src/nucleus/federation/federationEngine";
import { nucleusTelemetry } from "../../src/nucleus/telemetry/telemetryEngine";
import { nucleusMetrics } from "../../src/nucleus/metrics/metricsEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";

export class DataService {
  async storeObject(org: string, bucket: string, key: string, value: any) {
    const id = randomUUID();

    nucleusState.set(org, "data", `${bucket}.${key}`, {
      id,
      value,
      createdAt: Date.now(),
    });

    nucleusPipeline.execute(org, "data", "objectPipeline", {
      id,
      bucket,
      key,
    });

    nucleusCluster.distribute(org, "data", {
      id,
      bucket,
      key,
    });

    nucleusFederation.sync(org, "data", {
      id,
      bucket,
      key,
    });

    nucleusTelemetry.record(org, "data", "object.store", {
      id,
      bucket,
      key,
    });

    nucleusMetrics.record(org, "data", "object.store", {
      bucket,
    });

    nucleusAudit.log(org, "data", "object.store", "data-service", {
      id,
      bucket,
      key,
    });

    nucleusBilling.recordEvent(org, "data", "object.store", 1, 0.002, {
      bucket,
    });

    return { id, bucket, key };
  }

  async getObject(org: string, bucket: string, key: string) {
    return nucleusState.get(org, "data", `${bucket}.${key}`) ?? null;
  }

  async query(org: string, bucket: string, filter: (obj: any) => boolean) {
    const all = nucleusState.getAll(org, "data");
    const results = all.filter((o) => o.key?.startsWith(bucket) && filter(o));

    nucleusAudit.log(org, "data", "object.query", "data-service", {
      bucket,
      count: results.length,
    });

    return results;
  }
}

export const valtarisDataService = new DataService();
