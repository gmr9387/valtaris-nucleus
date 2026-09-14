// Phase 48 — Dashboard Data Providers

import { sovereigntyRuntime } from "../sovereignty/sovereigntyRuntime";
import { constitutionalPipeline } from "../pipeline/constitutionalPipeline";
import { adapterState } from "../adapters/adapterState";
import { ciState } from "../ci/ciState";
import { environmentActivationEngine } from "../activationEnv/environmentActivationEngine";
import { federationEngine } from "../federation/federationEngine";
import { autonomyEngine } from "../autonomy/autonomyEngine";
import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
import { telemetryEngine } from "../telemetry/telemetryEngine";
import { deploymentState } from "../deployment/deploymentState";
import { certificationState } from "../certification/certificationState";

export const dashboardProviders = {
  sovereignty: () => sovereigntyRuntime.lifecycle.status(),
  pipeline: () => constitutionalPipeline.execute(),
  adapters: () => adapterState,
  ci: () => ciState,
  activation: () => environmentActivationEngine.activateAll(),
  federation: () => ({
    tenants: federationEngine.identity.validateTenant,
    environments: federationEngine.identity.validateEnvironment,
  }),
  autonomy: () => autonomyEngine.health.checkAll(autonomyEngine.manifest.subsystems),
  resources: () => resourceGraph.listResources(),
  lineage: () => lineageEngine.list(),
  telemetry: () => telemetryEngine.list(),
  deployment: () => deploymentState,
  certification: () => certificationState,
};
