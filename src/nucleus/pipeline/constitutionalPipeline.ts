// Phase 42 — Constitutional Pipeline

import { pipelineManifest } from "./pipelineManifest";
import { pipelineState } from "./pipelineState";
import { enforceConstitution } from "../constitution/constitution";
import { sovereigntyRuntime } from "../sovereignty/sovereigntyRuntime";
import { environmentActivationEngine } from "../activationEnv/environmentActivationEngine";
import { federationEngine } from "../federation/federationEngine";
import { autonomyEngine } from "../autonomy/autonomyEngine";
import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
import { telemetryEngine } from "../telemetry/telemetryEngine";
import { nucleusWorkflow } from "../workflows/workflowEngine";
import type { Dynamic } from "../types/dynamic";

// FIXED: this previously looked up steps against pipelineEngines.ts's
// `pipelineEngines` export, which is an alias for a generic
// register()/start() pipeline-execution engine (unrelated in shape --
// it has no "constitution", "sovereignty", etc. keys at all). Every
// step lookup failed with "Unknown pipeline step", so execute() had
// never actually completed successfully. This wires each manifest step
// to the real subsystem method it names, matching the same engines
// ciSuites.ts already calls successfully.
const stepHandlers: Record<string, Record<string, () => Dynamic>> = {
  constitution: { enforce: () => enforceConstitution() },
  sovereignty: { boot: () => sovereigntyRuntime.boot() },
  environment: { activate: () => environmentActivationEngine.activateAll() },
  federation: { initialize: () => federationEngine.getNodes() },
  autonomy: {
    initialize: () => autonomyEngine.health.checkAll(autonomyEngine.manifest.subsystems),
  },
  resources: { initialize: () => resourceGraph.listResources() },
  lineage: { initialize: () => lineageEngine.list() },
  telemetry: { initialize: () => telemetryEngine.list() },
  workflows: { initialize: () => nucleusWorkflow.getDefinitions() },
  startup: { complete: () => ({ completedAt: new Date().toISOString() }) },
};

export class ConstitutionalPipeline {
  async execute() {
    if (!pipelineManifest.enabled) {
      throw new Error("Pipeline disabled by manifest");
    }

    for (const step of pipelineManifest.steps) {
      const [domain, action] = step.split(".");

      const handler = stepHandlers[domain]?.[action];
      if (!handler) {
        throw new Error(`Unknown pipeline step: ${step}`);
      }

      await handler();

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
