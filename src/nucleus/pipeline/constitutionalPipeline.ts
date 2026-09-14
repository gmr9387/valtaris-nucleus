// Phase 42 — Constitutional Pipeline

import { pipelineManifest } from "./pipelineManifest";
import { pipelineState } from "./pipelineState";
import { pipelineEngines } from "./pipelineEngines";
import type { Dynamic } from "../types/dynamic";

export class ConstitutionalPipeline {
  async execute() {
    if (!pipelineManifest.enabled) {
      throw new Error("Pipeline disabled by manifest");
    }

    for (const step of pipelineManifest.steps) {
      const [domain, action] = step.split(".");

      const engine = (pipelineEngines as Dynamic)[domain];
      if (!engine || !engine[action]) {
        throw new Error(`Unknown pipeline step: ${step}`);
      }

      await engine[action]();

      pipelineState.executedSteps.push(step);
    }

    pipelineState.completed = true;
    pipelineState.lastExecutedAt = new Date().toISOString();

    return {
      completed: pipelineState.completed,
      executedSteps: pipelineState.executedSteps,
      lastExecutedAt: pipelineState.lastExecutedAt,
    };
  }
}

export const constitutionalPipeline = new ConstitutionalPipeline();
