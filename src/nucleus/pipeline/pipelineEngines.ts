// src/nucleus/pipeline/pipelineEngine.ts
// Unified constitutional pipeline engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusEventBus } from "../events/eventBus";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type PipelineStep = {
  id: string;
  subsystem: string;
  action: string;
  next?: string;
};

export type PipelineDefinition = {
  id: string;
  org: string;
  name: string;
  steps: Record<string, PipelineStep>;
  entry: string;
  createdAt: number;
};

export type PipelineExecutionRecord = {
  id: string;
  pipelineId: string;
  org: string;
  name: string;
  stepId: string;
  subsystem: string;
  action: string;
  status: "success" | "error";
  payload?: any;
  error?: any;
  timestamp: number;
};

export class PipelineEngine {
  private definitions: Map<string, PipelineDefinition> = new Map();
  private executions: PipelineExecutionRecord[] = [];

  register(
    org: string,
    name: string,
    steps: Record<string, PipelineStep>,
    entry: string
  ) {
    const id = randomUUID();

    const definition: PipelineDefinition = {
      id,
      org,
      name,
      steps,
      entry,
      createdAt: Date.now(),
    };

    this.definitions.set(id, definition);

    console.log(`[PIPELINE][${name.toUpperCase()}] Registered pipeline`);

    return definition;
  }

  start(pipelineId: string, payload: any) {
    const definition = this.definitions.get(pipelineId);
    if (!definition) {
      console.error(`[PIPELINE] Definition not found: ${pipelineId}`);
      return;
    }

    this.executeStep(definition, definition.entry, payload);
  }

  private executeStep(
    definition: PipelineDefinition,
    stepId: string,
    payload: any
  ) {
    const step = definition.steps[stepId];
    if (!step) {
      console.error(`[PIPELINE] Step not found: ${stepId}`);
      return;
    }

    const prefix = `[PIPELINE][${definition.name.toUpperCase()}]`;
    console.log(prefix, `Executing step: ${step.action}`);

    // Publish event to subsystem
    nucleusEventBus.publish(
      definition.org,
      step.subsystem,
      step.action,
      payload
    );

    // Audit
    nucleusAudit.log(
      definition.org,
      step.subsystem,
      `pipeline.step.${step.action}`,
      "pipeline-engine",
      { pipeline: definition.name, step: stepId }
    );

    // Billing (simple per-step billing)
    nucleusBilling.recordEvent(
      definition.org,
      step.subsystem,
      `pipeline.step.${step.action}`,
      1,
      0.002, // $0.002 per step
      { pipeline: definition.name, step: stepId }
    );

    // Record execution
    const execution: PipelineExecutionRecord = {
      id: randomUUID(),
      pipelineId: definition.id,
      org: definition.org,
      name: definition.name,
      stepId,
      subsystem: step.subsystem,
      action: step.action,
      status: "success",
      payload,
      timestamp: Date.now(),
    };

    this.executions.push(execution);

    // Move to next step
    if (step.next) {
      this.executeStep(definition, step.next, payload);
    }
  }

  getDefinitions() {
    return [...this.definitions.values()];
  }

  getExecutions() {
    return [...this.executions];
  }

  getExecutionsByPipeline(pipelineId: string) {
    return this.executions.filter((e) => e.pipelineId === pipelineId);
  }

  clear() {
    this.definitions.clear();
    this.executions = [];
  }
}

export const nucleusPipeline = new PipelineEngine();
