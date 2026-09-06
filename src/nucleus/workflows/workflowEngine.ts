// src/nucleus/workflows/workflowEngine.ts
// Unified constitutional workflow engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusEventBus } from "../events/eventBus";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type WorkflowStep = {
  id: string;
  subsystem: string;
  action: string;
  next?: string;
  branches?: Record<string, string>; // conditionName -> nextStepId
  condition?: (payload: any) => string | null; // returns branch key
};

export type WorkflowDefinition = {
  id: string;
  org: string;
  name: string;
  steps: Record<string, WorkflowStep>;
  entry: string;
  createdAt: number;
};

export type WorkflowExecutionRecord = {
  id: string;
  workflowId: string;
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

export class WorkflowEngine {
  private definitions: Map<string, WorkflowDefinition> = new Map();
  private executions: WorkflowExecutionRecord[] = [];

  register(
    org: string,
    name: string,
    steps: Record<string, WorkflowStep>,
    entry: string
  ) {
    const id = randomUUID();

    const definition: WorkflowDefinition = {
      id,
      org,
      name,
      steps,
      entry,
      createdAt: Date.now(),
    };

    this.definitions.set(id, definition);

    console.log(`[WORKFLOW][${name.toUpperCase()}] Registered workflow`);

    return definition;
  }

  start(workflowId: string, payload: any) {
    const definition = this.definitions.get(workflowId);
    if (!definition) {
      console.error(`[WORKFLOW] Definition not found: ${workflowId}`);
      return;
    }

    this.executeStep(definition, definition.entry, payload);
  }

  private executeStep(
    definition: WorkflowDefinition,
    stepId: string,
    payload: any
  ) {
    const step = definition.steps[stepId];
    if (!step) {
      console.error(`[WORKFLOW] Step not found: ${stepId}`);
      return;
    }

    const prefix = `[WORKFLOW][${definition.name.toUpperCase()}]`;
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
      `workflow.step.${step.action}`,
      "workflow-engine",
      { workflow: definition.name, step: stepId }
    );

    // Billing (simple per-step billing)
    nucleusBilling.recordEvent(
      definition.org,
      step.subsystem,
      `workflow.step.${step.action}`,
      1,
      0.003, // $0.003 per workflow step
      { workflow: definition.name, step: stepId }
    );

    // Record execution
    const execution: WorkflowExecutionRecord = {
      id: randomUUID(),
      workflowId: definition.id,
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

    // Branching logic
    if (step.condition && step.branches) {
      const branchKey = step.condition(payload);
      if (branchKey && step.branches[branchKey]) {
        const nextStep = step.branches[branchKey];
        console.log(prefix, `Branch selected: ${branchKey} → ${nextStep}`);
        this.executeStep(definition, nextStep, payload);
        return;
      }
    }

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

  getExecutionsByWorkflow(workflowId: string) {
    return this.executions.filter((e) => e.workflowId === workflowId);
  }

  clear() {
    this.definitions.clear();
    this.executions = [];
  }
}

export const nucleusWorkflow = new WorkflowEngine();
