// src/nucleus/orchestration/orchestrationRouter.ts
// Unified constitutional orchestration router for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import { nucleusEventBus } from "../events/eventBus";

export type OrchestrationStep = {
  id: string;
  subsystem: string;
  action: string;
  next?: string; // next step ID
  condition?: (payload: any) => boolean;
};

export type OrchestrationDefinition = {
  id: string;
  org: string;
  name: string;
  steps: Record<string, OrchestrationStep>;
  entry: string; // entry step ID
  createdAt: number;
};

export class OrchestrationRouter {
  private definitions: Map<string, OrchestrationDefinition> = new Map();

  register(
    org: string,
    name: string,
    steps: Record<string, OrchestrationStep>,
    entry: string
  ) {
    const id = randomUUID();

    const definition: OrchestrationDefinition = {
      id,
      org,
      name,
      steps,
      entry,
      createdAt: Date.now(),
    };

    this.definitions.set(id, definition);

    console.log(`[ORCH][${name.toUpperCase()}] Registered orchestration`);

    return definition;
  }

  start(definitionId: string, payload: any) {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      console.error(`[ORCH] Definition not found: ${definitionId}`);
      return;
    }

    this.executeStep(definition, definition.entry, payload);
  }

  private executeStep(
    definition: OrchestrationDefinition,
    stepId: string,
    payload: any
  ) {
    const step = definition.steps[stepId];
    if (!step) {
      console.error(`[ORCH] Step not found: ${stepId}`);
      return;
    }

    const prefix = `[ORCH][${definition.name.toUpperCase()}]`;
    console.log(prefix, `Executing step: ${step.action}`);

    // Publish event for subsystem to handle
    nucleusEventBus.publish(
      definition.org,
      step.subsystem,
      step.action,
      payload
    );

    // Conditional routing
    if (step.condition && !step.condition(payload)) {
      console.log(prefix, `Condition failed for step ${stepId}`);
      return;
    }

    // Move to next step
    if (step.next) {
      this.executeStep(definition, step.next, payload);
    }
  }

  getDefinitions() {
    return [...this.definitions.values()];
  }

  clear() {
    this.definitions.clear();
  }
}

export const nucleusOrchestration = new OrchestrationRouter();
