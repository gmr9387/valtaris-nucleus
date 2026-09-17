// Phase 46 — CLI Commands

// FIXED: this imported the lightweight startup/startNucleus.ts, which
// only booted sovereigntyRuntime + generateActivationProof() -- no
// subsystem registration, no API server. That's a different, weaker
// boot than what actually runs in production (bun nucleus-server.ts ->
// this same-named top-level startNucleus(), which runs the real
// DeploymentBootstrap -> nucleusBoot() + APIServer.start() sequence).
// Anyone running the CLI's "start" command got a system that silently
// couldn't process claims. Now points at the real one, matching
// nucleus-server.ts's own ORGANIZATION_ID convention. The old
// startup/startNucleus.ts + NucleusServer.ts had no other callers
// anywhere in the codebase once this changed, so that folder is deleted
// rather than left as dead code.
import { startNucleus } from "../startNucleus";
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
import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import { nucleusBenchmark } from "../benchmark/benchmarkEngine";
import { nucleusDiagnostics } from "../diagnostics/diagnosticsEngine";
import { nucleusHealth } from "../health/healthEngine";
import { nucleusMetrics } from "../metrics/metricsEngine";

export const cliCommands = {
  start: async () => startNucleus(process.env.ORGANIZATION_ID || "dev-org"),
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
  // gapMap.md's "Internal Benchmark Suite" (#20) -- runs real claims
  // through the real pipeline and reports real timing, not a synthetic
  // stand-in. registerAllSubsystems() matches the same idempotent
  // pattern the `autonomy`/`certify` commands already need for a
  // standalone CLI invocation.
  benchmark: async () => {
    registerAllSubsystems();
    const iterations = Number(process.env.BENCHMARK_ITERATIONS) || 10;
    return nucleusBenchmark.run(process.env.ORGANIZATION_ID || "dev-org", iterations);
  },
  // gapMap.md's Shell+CLI gap "Unified diagnostics/health/metrics CLI
  // commands specifically" -- `autonomy` already runs the real
  // DiagnosticsEngine/HealthEngine chain (via subsystemHealthEngine),
  // but only ever surfaces its boolean healthy/unhealthy summary, never
  // which specific check passed or failed. `diagnostics`/`health` run
  // that same real chain (same registerAllSubsystems() + checkAll()
  // pattern `autonomy`/`benchmark` already need standalone) and return
  // the full breakdown its own engines already compute.
  diagnostics: async () => {
    registerAllSubsystems();
    await autonomyEngine.health.checkAll(autonomyEngine.manifest.subsystems);
    return nucleusDiagnostics.getResults();
  },
  health: async () => {
    registerAllSubsystems();
    await autonomyEngine.health.checkAll(autonomyEngine.manifest.subsystems);
    return nucleusHealth.getStatuses();
  },
  // MetricsEngine already records real dispatch latency on every claim
  // (RuntimeRouter.dispatch()) and was already readable via
  // GET /api/internal-status -- this is its first CLI reader, same
  // "expose the real engine's own getter" pattern as
  // `resources`/`lineage`/`telemetry` above.
  metrics: async () => nucleusMetrics.getPoints(),
};
