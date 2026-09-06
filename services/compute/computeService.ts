// services/compute/computeService.ts
// Compute Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusScheduler } from "../../src/nucleus/scheduler/scheduler";
import { nucleusRetry } from "../../src/nucleus/retry/retryEngine";
import { nucleusRecovery } from "../../src/nucleus/recovery/recoveryEngine";
import { nucleusCluster } from "../../src/nucleus/cluster/clusterEngine";
import { nucleusTelemetry } from "../../src/nucleus/telemetry/telemetryEngine";
import { nucleusMetrics } from "../../src/nucleus/metrics/metricsEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";

export class ComputeService {
  async runTask(org: string, name: string, payload: any) {
    const taskId = randomUUID();

    const scheduled = nucleusScheduler.schedule(org, "compute", name, {
      taskId,
      payload,
    });

    nucleusCluster.distribute(org, "compute", {
      taskId,
      payload,
    });

    nucleusTelemetry.record(org, "compute", "task.run", {
      taskId,
      name,
    });

    nucleusMetrics.record(org, "compute", "task.run", {
      name,
    });

    nucleusAudit.log(org, "compute", "task.run", "compute-service", {
      taskId,
      name,
    });

    nucleusBilling.recordEvent(org, "compute", "task.run", 1, 0.004, {
      name,
    });

    return { taskId, scheduled };
  }

  async retryTask(org: string, taskId: string) {
    const retry = nucleusRetry.retry(org, "compute", taskId);

    nucleusAudit.log(org, "compute", "task.retry", "compute-service", {
      taskId,
    });

    return { taskId, retry };
  }

  async recoverTask(org: string, taskId: string) {
    const recovery = nucleusRecovery.recover(org, "compute", taskId);

    nucleusAudit.log(org, "compute", "task.recover", "compute-service", {
      taskId,
    });

    return { taskId, recovery };
  }
}

export const valtarisComputeService = new ComputeService();
