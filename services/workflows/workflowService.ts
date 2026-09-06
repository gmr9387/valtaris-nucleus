// services/workflows/workflowService.ts
// Workflow Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusWorkflow } from "../../src/nucleus/workflows/workflowEngine";
import { nucleusPipeline } from "../../src/nucleus/pipelines/pipelineEngine";
import { nucleusEventBus } from "../../src/nucleus/events/eventBus";
import { nucleusState } from "../../src/nucleus/state/stateEngine";
import { nucleusTelemetry } from "../../src/nucleus/telemetry/telemetryEngine";
import { nucleusScheduler } from "../../src/nucleus/scheduler/scheduler";
import { nucleusRetry } from "../../src/nucleus/retry/retryEngine";
import { nucleusRecovery } from "../../src/nucleus/recovery/recoveryEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";

export class WorkflowService {
  async defineWorkflow(org: string, name: string, steps: any[]) {
    const workflowId = randomUUID();

    nucleusState.set(org, "workflows", `definition.${workflowId}`, {
      workflowId,
      name,
      steps,
      createdAt: Date.now(),
    });

    nucleusAudit.log(org, "workflows", "workflow.define", "workflow-service", {
      workflowId,
      name,
    });

    return { workflowId, name };
  }

  async startWorkflow(org: string, workflowId: string, input: any) {
    const definition = nucleusState.get(org, "workflows", `definition.${workflowId}`);
    if (!definition) return { status: "not-found" };

    const instanceId = randomUUID();

    const workflow = nucleusWorkflow.start(org, "workflows", definition.name, {
      instanceId,
      input,
      steps: definition.steps,
    });

    nucleusPipeline.execute(org, "workflows", "workflowPipeline", {
      instanceId,
      input,
    });

    nucleusEventBus.emit(org, "workflows", "workflow.started", {
      instanceId,
      workflowId,
      input,
    });

    nucleusTelemetry.record(org, "workflows", "workflow.start", {
      instanceId,
      workflowId,
    });

    nucleusBilling.recordEvent(org, "workflows", "workflow.start", 1, 0.005, {
      workflowId,
    });

    nucleusState.set(org, "workflows", `instance.${instanceId}`, {
      instanceId,
      workflowId,
      input,
      status: "running",
      startedAt: Date.now(),
    });

    return { instanceId, status: "running" };
  }

  async retryWorkflow(org: string, instanceId: string) {
    const instance = nucleusState.get(org, "workflows", `instance.${instanceId}`);
    if (!instance) return { status: "not-found" };

    const retry = nucleusRetry.retry(org, "workflows", instanceId);

    nucleusEventBus.emit(org, "workflows", "workflow.retry", {
      instanceId,
    });

    nucleusAudit.log(org, "workflows", "workflow.retry", "workflow-service", {
      instanceId,
    });

    nucleusBilling.recordEvent(org, "workflows", "workflow.retry", 1, 0.003, {
      instanceId,
    });

    return { instanceId, retry };
  }

  async recoverWorkflow(org: string, instanceId: string) {
    const instance = nucleusState.get(org, "workflows", `instance.${instanceId}`);
    if (!instance) return { status: "not-found" };

    const recovery = nucleusRecovery.recover(org, "workflows", instanceId);

    nucleusEventBus.emit(org, "workflows", "workflow.recovered", {
      instanceId,
    });

    nucleusAudit.log(org, "workflows", "workflow.recover", "workflow-service", {
      instanceId,
    });

    nucleusBilling.recordEvent(org, "workflows", "workflow.recover", 1, 0.004, {
      instanceId,
    });

    return { instanceId, recovery };
  }

  async getWorkflowInstance(org: string, instanceId: string) {
    return nucleusState.get(org, "workflows", `instance.${instanceId}`) ?? null;
  }
}

export const valtarisWorkflowService = new WorkflowService();
