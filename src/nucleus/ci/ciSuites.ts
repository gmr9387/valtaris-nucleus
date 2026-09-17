// Phase 44 — CI Suites

import { constitution } from "../constitution/constitution";
import { sovereigntyRuntime } from "../sovereignty/sovereigntyRuntime";
import { environmentActivationEngine } from "../activationEnv/environmentActivationEngine";
import { federationEngine } from "../federation/federationEngine";
import { registerKnownFederationTopology } from "../federation/registerKnownTopology";
import { autonomyEngine } from "../autonomy/autonomyEngine";
import { constitutionalPipeline } from "../pipeline/constitutionalPipeline";
import { adapterAutoWireEngine } from "../adapters/adapterAutoWireEngine";
import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
// telemetryEngine.ts's list()/recordEvent() now delegate to
// telemetry/telemetry.ts's live store (the one weaver/guardian/glue/
// dualpay's real runtimes write to on every dispatch) instead of
// keeping a second, boot-only array -- see telemetryEngine.ts's own
// header comment. Both imports below now read the same underlying
// data; kept separate only because telemetryEngine.ts is still the
// name constitutionalPipeline.ts/internal-status/the CLI use.
import { telemetryEngine } from "../telemetry/telemetryEngine";
import { nucleusTelemetry as liveTelemetry } from "../telemetry/telemetry";
import { nucleusAudit } from "../audit/auditEngine";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import { OSPipeline } from "../runtime/osPipeline";
import { RuntimeGuardError } from "../runtime/runtimeGuards";
import {
  setTenantSubsystemEnabled,
  clearTenantSubsystemOverrides,
  getTenantSubsystemOverrideHistory,
} from "../subsystems/tenantSubsystemOverrides";
import { nucleusGovernance } from "../governance/governanceEngine";
import { governanceSandbox } from "../governance/governanceSandbox";
import { certificationState } from "../certification/certificationState";
import { certificationSandbox } from "../certification/certificationSandbox";
import { certifyNucleus, getCertificationHistory } from "../certification/certifyNucleus";
import { nucleusBenchmark } from "../benchmark/benchmarkEngine";
import { adapterState } from "../adapters/adapterState";
import { adapterSandbox } from "../adapters/adapterSandbox";

export const ciSuites = {
  "constitution.tests": () => ({
    version: constitution.version,
    subsystems: constitution.subsystems.length,
    contracts: constitution.contracts.length,
    resources: constitution.resources.length,
  }),

  "sovereignty.tests": () => sovereigntyRuntime.boot(),

  "activation.tests": () => environmentActivationEngine.activateAll(),

  // registerKnownFederationTopology() is idempotent, and registered here
  // (before "pipeline.tests" runs constitutionalPipeline.execute()'s own
  // "federation.initialize" step) for the same reason
  // registerAllSubsystems() is called in "autonomy.tests" below: this
  // process doesn't otherwise run DeploymentBootstrap.start(), so
  // without this, federationEngine.getNodes() would report empty here
  // too -- correct in this process, but not proof the real wiring works.
  "federation.tests": () => {
    registerKnownFederationTopology();
    const nodes = federationEngine.getNodes();
    const links = federationEngine.getLinks();

    // gapMap.md's Federation gap "no live network topology beyond the
    // one confirmed link": valtaris-glue's real supabase/functions/
    // execute-api Edge Function calling nucleus's real
    // adjudicate-claim/weaver-score/guardian-status endpoints is a
    // second real, confirmed link (same evidentiary bar as DualPay's --
    // real code calling the real endpoint). Asserted here, not just
    // returned, so a future regression in registerKnownTopology.ts
    // actually fails CI.
    const nucleusNode = nodes.find((n) => n.name === "nucleus");
    const glueNode = nodes.find((n) => n.name === "valtaris-glue");
    if (!nucleusNode || !glueNode) {
      throw new Error(
        "federation.tests: expected both the nucleus and valtaris-glue nodes to be registered",
      );
    }
    const glueLinked = links.some(
      (l) => l.sourceNode === glueNode.id && l.targetNode === nucleusNode.id,
    );
    if (!glueLinked) {
      throw new Error("federation.tests: expected a real valtaris-glue -> nucleus link");
    }

    return {
      tenants: federationEngine.identity.validateTenant("tenant-a"),
      environments: federationEngine.identity.validateEnvironment("dev"),
      nodes,
      links,
    };
  },

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

  // gapMap.md's ResourceGraph gap: this used to just return
  // resourceGraph.listResources() with nothing to actually check --
  // vacuously "passing" whether or not RuntimeRouter.dispatch() (see
  // that file's own comment) really wired resource creation in. Now
  // asserts dispatch.tests's real claim actually produced all four
  // constitutionally-declared resource types, that each carries a real
  // identity, and that enforceResourceGuards() genuinely throws on a
  // cross-subsystem mutation attempt -- proving the guard is live, not
  // just imported.
  "resources.tests": () => {
    const resources = resourceGraph.listResources();
    const expectedTypes = [
      "OpportunityResource",
      "AuthorizationResource",
      "WorkflowResource",
      "PaymentResource",
    ];

    for (const type of expectedTypes) {
      if (!resources.some((r) => r.type === type)) {
        throw new Error(
          `resources.tests: expected a real "${type}" from dispatch.tests's claim, found none`,
        );
      }
    }

    if (!resources.every((r) => r.identity.projectId)) {
      throw new Error("resources.tests: every real resource should carry a projectId");
    }

    const target = resources.find((r) => r.type === "AuthorizationResource")!;
    let guardThrew = false;
    try {
      resourceGraph.mutateResource(
        target.id,
        { ...target.identity, subsystem: "weaver", capability: "discover" },
        () => ({ hacked: true }),
      );
    } catch (error) {
      guardThrew = error instanceof Error && error.message === "Subsystem boundary violation";
    }
    if (!guardThrew) {
      throw new Error(
        "resources.tests: enforceResourceGuards() should have thrown on a cross-subsystem mutation attempt",
      );
    }

    return resources;
  },

  "lineage.tests": () => lineageEngine.list(),

  // telemetryEngine.list() used to be a separate, boot-only array,
  // always a single "runtime.boot" entry regardless of real claim
  // activity -- now it delegates to the same live store liveTelemetry
  // reads directly (see telemetryEngine.ts's header comment). This
  // suite asserts that consolidation actually holds instead of just
  // trusting the comment: both reads must agree.
  "telemetry.tests": () => {
    const viaEngine = telemetryEngine.list();
    const viaLive = liveTelemetry.getAll();

    if (viaEngine.length !== viaLive.length) {
      throw new Error(
        `telemetry.tests: telemetryEngine.list() (${viaEngine.length}) and the live telemetry store (${viaLive.length}) disagree -- consolidation is broken`,
      );
    }

    return { events: viaLive };
  },

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

  // gapMap.md's "Governance sandbox (rule validation + isolation)" and
  // "Certification sandbox (proof generation + validation)" -- unlike
  // every other gap closed this session, there was no existing module
  // to wire in for either; the concept itself didn't exist anywhere.
  // Isolation is the part worth actually proving, not just asserting in
  // a comment: this runs both sandboxes against real data (the real
  // governance decisions dispatch.tests just produced, and real current
  // lineage state) and then verifies neither one touched the real state
  // it read. A sandbox that quietly wrote through would be worse than
  // no sandbox at all.
  "sandbox.tests": () => {
    const decisionsBefore = nucleusGovernance.getDecisions().length;

    const governanceReplay = governanceSandbox.replay({
      name: "sandbox.always-deny",
      evaluate: () => false,
    });

    if (nucleusGovernance.getDecisions().length !== decisionsBefore) {
      throw new Error(
        "sandbox.tests: GovernanceSandbox.replay() mutated real governance decisions -- isolation broken",
      );
    }

    const certificationSnapshot = { ...certificationState, proofs: [...certificationState.proofs] };

    const certificationTry = certificationSandbox.tryCheck(
      "sandbox.lineage-populated",
      () => lineageEngine.list().length > 0,
    );

    if (
      certificationState.certified !== certificationSnapshot.certified ||
      certificationState.proofs.length !== certificationSnapshot.proofs.length
    ) {
      throw new Error(
        "sandbox.tests: CertificationSandbox.tryCheck() mutated real certificationState -- isolation broken",
      );
    }

    return { governanceReplay, certificationTry };
  },

  // gapMap.md's Weaver gap "Multi-tenant subsystem activation rules" and
  // DualPay gap "Multi-tenant payment isolation hooks" -- proves
  // tenantSubsystemOverrides.ts's per-org override actually changes real
  // dispatch outcomes (not just that the functions exist): a baseline
  // claim for org A succeeds with dualpay enabled (the global default),
  // an override disabling dualpay for org A alone then makes the same
  // dispatch fail, a claim for a *different* org with no override at all
  // proves the override didn't leak across tenants, and clearing the
  // override restores org A to the global default.
  "tenant-override.tests": async () => {
    registerAllSubsystems();

    const orgA = "org-ci-tenant-override-a";
    const orgB = "org-ci-tenant-override-b";

    const baseline = await OSPipeline.runClaim(orgA, {
      claimId: "ci-tenant-override-baseline",
      amount: 100,
    });
    if (!baseline.payment) {
      throw new Error(
        "tenant-override.tests: baseline claim for org A should succeed with dualpay enabled globally",
      );
    }

    setTenantSubsystemEnabled(orgA, "dualpay", false);

    let deniedForOrgA = false;
    try {
      await OSPipeline.runClaim(orgA, {
        claimId: "ci-tenant-override-denied",
        amount: 100,
      });
    } catch (error) {
      deniedForOrgA = error instanceof RuntimeGuardError;
    }

    if (!deniedForOrgA) {
      throw new Error(
        "tenant-override.tests: org A's tenant override should have denied dualpay dispatch",
      );
    }

    const orgBResult = await OSPipeline.runClaim(orgB, {
      claimId: "ci-tenant-override-orgb",
      amount: 100,
    });
    if (!orgBResult.payment) {
      throw new Error(
        "tenant-override.tests: org B (no override set) should be unaffected by org A's override -- cross-tenant leakage",
      );
    }

    clearTenantSubsystemOverrides(orgA);

    const afterClear = await OSPipeline.runClaim(orgA, {
      claimId: "ci-tenant-override-after-clear",
      amount: 100,
    });
    if (!afterClear.payment) {
      throw new Error(
        "tenant-override.tests: clearing org A's override should restore the global default",
      );
    }

    return {
      deniedForOrgA,
      orgBUnaffected: !!orgBResult.payment,
      restoredAfterClear: !!afterClear.payment,
    };
  },

  // gapMap.md's Guardian gap "Versioned governance rules (diffs +
  // snapshots)" and Certification Engine gap "Versioned certifications
  // (history + snapshots)" -- both closed via StateEngine's existing
  // diff/snapshot mechanism (the same one RuntimeRouter.dispatch()
  // already trusts for claim state) applied to policy/certification
  // history, not a second, parallel history mechanism. This proves real
  // diffs/snapshots actually accumulate on real changes, not just that
  // the functions exist.
  "versioning.tests": async () => {
    const org = "org-ci-versioning";
    const before = getTenantSubsystemOverrideHistory(org, "weaver").length;

    setTenantSubsystemEnabled(org, "weaver", false);
    setTenantSubsystemEnabled(org, "weaver", true);

    const overrideHistory = getTenantSubsystemOverrideHistory(org, "weaver");
    if (overrideHistory.length !== before + 2) {
      throw new Error(
        "versioning.tests: each tenant override change should produce its own real diff",
      );
    }

    clearTenantSubsystemOverrides(org);

    const certBefore = getCertificationHistory();
    await certifyNucleus();
    const certAfter = getCertificationHistory();

    if (certAfter.diffs.length <= certBefore.diffs.length) {
      throw new Error("versioning.tests: certifyNucleus() should record a new versioned diff");
    }
    if (certAfter.snapshots.length <= certBefore.snapshots.length) {
      throw new Error("versioning.tests: certifyNucleus() should record a new snapshot");
    }

    return {
      overrideDiffCount: overrideHistory.length,
      certificationDiffCount: certAfter.diffs.length,
      certificationSnapshotCount: certAfter.snapshots.length,
    };
  },

  // gapMap.md's "Internal Benchmark Suite (runtime/pipelines/workflows)"
  // (#20) -- the last genuinely untouched item on the list. Runs a
  // small number of real claims (3, to keep `bun run ci` fast) through
  // the real pipeline under a dedicated "org-benchmark-selfcheck"
  // tenant and asserts the results are internally consistent, not just
  // that nothing threw.
  "benchmark.tests": async () => {
    registerAllSubsystems();

    const result = await nucleusBenchmark.run("org-benchmark-selfcheck", 3);

    if (result.perClaimDurationsMs.length !== 3) {
      throw new Error(
        `benchmark.tests: expected 3 timed claims, got ${result.perClaimDurationsMs.length}`,
      );
    }
    if (result.minMs > result.avgMs || result.avgMs > result.maxMs) {
      throw new Error(
        `benchmark.tests: min/avg/max out of order (${result.minMs}/${result.avgMs}/${result.maxMs})`,
      );
    }
    for (const stage of [
      "opportunity",
      "recommendation",
      "authorization",
      "execution",
      "payment",
    ]) {
      if (!(result.perStageAvgMs[stage] >= 0)) {
        throw new Error(`benchmark.tests: no timing recorded for stage "${stage}"`);
      }
    }

    return result;
  },

  // gapMap.md's "Adapter Registry + Sandbox" (#18) -- the registry half
  // (dependency-ordered loading on real boot) closed earlier this
  // session; this closes the sandbox half. Proves three things a
  // comment alone wouldn't: the real manifest's dependency graph
  // actually resolves (adapterAutoWireEngine.autoWire() has no cycle/
  // unknown-adapter detection of its own -- this is the first thing
  // that would ever catch a broken graph before a real boot does), a
  // genuinely broken graph is correctly rejected rather than silently
  // accepted, and none of this touches the real adapterState.loaded
  // that a real boot's autoWire() call commits to.
  "adapter-sandbox.tests": () => {
    const loadedBefore = [...adapterState.loaded];

    const realGraph = adapterSandbox.tryLoadAll();
    if (!realGraph.ok) {
      throw new Error(
        `adapter-sandbox.tests: the real adapter manifest does not resolve -- ${JSON.stringify(realGraph.results.filter((r) => !r.resolvable))}`,
      );
    }

    const unknown = adapterSandbox.tryLoad("nonexistent.adapter");
    if (unknown.resolvable) {
      throw new Error("adapter-sandbox.tests: sandbox accepted an unknown adapter as resolvable");
    }

    if (JSON.stringify(adapterState.loaded) !== JSON.stringify(loadedBefore)) {
      throw new Error(
        "adapter-sandbox.tests: AdapterSandbox mutated real adapterState.loaded -- isolation broken",
      );
    }

    return { realGraph, unknownAdapterRejected: !unknown.resolvable };
  },
};
