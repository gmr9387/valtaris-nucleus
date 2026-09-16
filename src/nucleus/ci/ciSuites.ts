// Phase 44 — CI Suites

import { constitution } from "../constitution/constitution";
import { sovereigntyRuntime } from "../sovereignty/sovereigntyRuntime";
import { environmentActivationEngine } from "../activationEnv/environmentActivationEngine";
import { federationEngine } from "../federation/federationEngine";
import { autonomyEngine } from "../autonomy/autonomyEngine";
import { constitutionalPipeline } from "../pipeline/constitutionalPipeline";
import { adapterAutoWireEngine } from "../adapters/adapterAutoWireEngine";
import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
import { telemetryEngine } from "../telemetry/telemetryEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";

export const ciSuites = {
  "constitution.tests": () => ({
    version: constitution.version,
    subsystems: constitution.subsystems.length,
    contracts: constitution.contracts.length,
    resources: constitution.resources.length,
  }),

  "sovereignty.tests": () => sovereigntyRuntime.boot(),

  "activation.tests": () => environmentActivationEngine.activateAll(),

  "federation.tests": () => ({
    tenants: federationEngine.identity.validateTenant("tenant-a"),
    environments: federationEngine.identity.validateEnvironment("dev"),
  }),

  // registerAllSubsystems() is idempotent -- called here because `bun
  // run ci` runs this suite in its own process, which (unlike a real
  // server boot or nucleusBoot()) never otherwise registers the four
  // claim-processing subsystems. Without this, health.checkAll() below
  // -- now a real diagnostics-backed check instead of a hardcoded stub,
  // see subsystemHealthEngine.ts -- would correctly but misleadingly
  // report every subsystem "unhealthy" for a reason that has nothing to
  // do with autonomy: they were simply never registered in this process.
  "autonomy.tests": async () => {
    registerAllSubsystems();
    return {
      health: await autonomyEngine.health.checkAll(autonomyEngine.manifest.subsystems),
      healing: await autonomyEngine.healing.healAll(autonomyEngine.manifest.subsystems),
    };
  },

  "pipeline.tests": () => constitutionalPipeline.execute(),

  "adapters.tests": () => adapterAutoWireEngine.autoWire(),

  "resources.tests": () => resourceGraph.listResources(),

  "lineage.tests": () => lineageEngine.list(),

  "telemetry.tests": () => telemetryEngine.list(),

  // gapMap.md's "Unified Audit Engine (reports + proofs)" gap: the log
  // half (nucleusAudit.log()) was already the most heavily-used module
  // in the codebase; report() (see auditEngine.ts) is the aggregation
  // half that was missing. This suite is that report's live "proof" --
  // the same self-check role every other suite here already plays,
  // not a new mechanism (certificationProofs.ts already has a parallel
  // *.proof map for this, but it has zero real callers anywhere in the
  // codebase; this suite list is the one bun run ci actually executes).
  "audit.tests": () => nucleusAudit.report(),
};
