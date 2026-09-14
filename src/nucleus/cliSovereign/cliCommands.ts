// Phase 46 — CLI Commands

import { startNucleus } from "../startup/startNucleus";
import { runPipeline } from "../pipeline/runPipeline";
import { loadAdapters } from "../adapters/loadAdapters";
import { runCI } from "../ci/runCI";
import { sovereigntyRuntime } from "../sovereignty/sovereigntyRuntime";
import { environmentActivationEngine } from "../activationEnv/environmentActivationEngine";
import { federationEngine } from "../federation/federationEngine";
import { autonomyEngine } from "../autonomy/autonomyEngine";
import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
import { telemetryEngine } from "../telemetry/telemetryEngine";
import { deployNucleus } from "../deployment/deployNucleus";
import { certifyNucleus } from "../certification/certifyNucleus";

export const cliCommands = {
  start: async () => startNucleus(),
  pipeline: async () => runPipeline(),
  adapters: async () => loadAdapters(),
  ci: async () => runCI(),
  sovereignty: async () => sovereigntyRuntime.boot(),
  activation: async () => environmentActivationEngine.activateAll(),
  federation: async () => federationEngine.identity,
  autonomy: async () => autonomyEngine.health.checkAll(autonomyEngine.manifest.subsystems),
  resources: async () => resourceGraph.listResources(),
  lineage: async () => lineageEngine.list(),
  telemetry: async () => telemetryEngine.list(),
  deploy: async () => deployNucleus(),
  certify: async () => certifyNucleus(),
};
