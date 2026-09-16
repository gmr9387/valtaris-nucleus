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
import { OSPipeline } from "../runtime/osPipeline";

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

  // gapMap.md's "Internal Test Harness (pipelines/workflows/governance)",
  // #19: every suite above exercises an individual engine in isolation,
  // but none of them ever actually dispatch a claim -- so RuntimeGuards,
  // GovernanceEngine, contract validation, StateEngine, and
  // MetricsEngine (all wired into RuntimeRouter.dispatch() this session)
  // had zero CI coverage of the one path a real organization actually
  // calls. This runs the same full five-stage chain
  // src/nucleus/tests/osPipeline.test.ts already proves under vitest,
  // but as part of the Sovereign CI self-check `bun run ci` runs on its
  // own, under a dedicated "org-ci-selfcheck" tenant so it never mixes
  // with real organization data.
  "dispatch.tests": async () => {
    registerAllSubsystems();

    const claimId = "ci-selfcheck-claim";
    const organizationId = "org-ci-selfcheck";
    const result = await OSPipeline.runClaim(organizationId, { claimId, amount: 100 });

    if (result.claimId !== claimId || result.organizationId !== organizationId) {
      throw new Error("dispatch.tests: claim identity did not round-trip through the pipeline");
    }
    const stages = [
      "opportunity",
      "recommendation",
      "authorization",
      "execution",
      "payment",
    ] as const;
    for (const stage of stages) {
      if (!result[stage]) {
        throw new Error(`dispatch.tests: "${stage}" stage produced no result`);
      }
    }

    return result;
  },
};
