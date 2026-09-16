// src/nucleus/deployment/bootstrap.ts

import { constitution } from "../constitution";
import { APIServer } from "../api/apiServer";
import { nucleusBoot } from "../runtime/nucleusBoot";
import { nucleusScheduler } from "../scheduler/scheduler";
import { loadAdapters } from "../adapters/loadAdapters";
import { constitutionalPipeline } from "../pipeline/constitutionalPipeline";

/**
 * FIXED (again): the constitution module was restructured since the
 * last fix into a folder exporting a plain data object named
 * "constitution" (lowercase), not a "Constitution" class with a
 * .describe() method -- confirmed by actually running the boot chain,
 * which threw a SyntaxError at this import. Logging the object
 * directly now instead of calling a method that no longer exists
 * anywhere in the new shape.
 */

/**
 * FIXED: previously this file duplicated part of nucleusBoot()'s work
 * manually (calling registerAllSubsystems() directly, constructing its
 * own RuntimeContext and RuntimeHook) without ever calling nucleusBoot()
 * itself -- meaning the "unified boot sequence" it was designed to run
 * never actually ran on real startup. This now calls it directly.
 *
 * KNOWN REMAINING ISSUE (not fixed here, flagging instead of guessing):
 *   RuntimeHook.attachSubsystemHooks() throws "Subsystem identity
 *   violation" whenever ctx.subsystem does not exactly match the
 *   subsystem an event came from. nucleusBoot() constructs a single
 *   NucleusRuntime scoped to ONE subsystem + organizationId. Since
 *   osPipeline.ts needs to dispatch across four different subsystems
 *   (weaver, guardian, glue, dualpay) in a single claim run, either:
 *     (a) nucleusBoot() needs to run once per subsystem (four runtimes),
 *         or
 *     (b) RuntimeHook's identity check needs to allow a "nucleus"-scoped
 *         orchestrator to dispatch on behalf of any subsystem.
 *   This is a real design decision, not a one-line fix -- flagging it
 *   here rather than picking an answer for you.
 */
export class DeploymentBootstrap {
  static async start(organizationId: string, port: number = 3000) {
    console.log("=== Valtaris Nucleus Boot Sequence ===");

    // 1. Load Constitution (kept for the startup log; nucleusBoot()
    //    also performs constitutional init internally via constitutionBoot()).
    console.log("Constitution:", constitution);

    // 2. Run the real unified boot sequence: constitutional init +
    //    subsystem registration + runtime creation, all in one place.
    //    NOTE: "nucleus" here is the orchestrator identity -- see the
    //    known-issue comment above regarding per-subsystem dispatch.
    const runtime = nucleusBoot("nucleus", organizationId);

    // 2a. adapters/adapterAutoWireEngine.ts (dependency-ordered adapter
    // loading against adapterManifest.ts + adapterDependencyGraph.ts)
    // and pipeline/constitutionalPipeline.ts (the constitution/
    // sovereignty/environment/federation/autonomy/resources/lineage/
    // telemetry/workflows boot sequence) were both fully built and
    // exercised only by `bun run ci` (ciSuites.ts's "adapters.tests"
    // and "pipeline.tests") and the CLI's `adapters`/`pipeline`
    // commands -- neither ran on an actual server boot before this.
    // Running them here means every real process start now actually
    // wires adapters in dependency order and runs the constitutional
    // pipeline, instead of that only ever being proven in CI.
    await loadAdapters();
    await constitutionalPipeline.execute();

    // 3. Start API server. This is the ONLY place APIServer.start() is
    // called -- nucleus-server.ts used to call it a second time after
    // calling startNucleus(), which reached here first and already
    // bound the port; the second call crashed on EADDRINUSE every time
    // ("Failed to start server. Is port 3000 in use?"), confirmed by
    // actually running nucleus-server.ts and hitting /api/health.
    APIServer.start(port);

    // 4. Liveness heartbeat. scheduler.ts was, like queueEngine.ts and
    // retryEngine.ts before it, fully built (audit + billing hooks,
    // the works) with zero real callers anywhere in the codebase --
    // this is its first one. Every 60s, enqueues + immediately
    // delivers a heartbeat message through nucleusQueue, so both
    // Scheduler and QueueEngine's timer-driven path (not just their
    // request-driven path, already proven by the telemetry wiring)
    // has a real, live exercise -- a persistent process that never
    // once fires setInterval-driven code is not meaningfully "live,"
    // just imported.
    nucleusScheduler.register(
      "platform",
      "nucleus",
      "heartbeat",
      60_000,
      { alive: true },
      (msg) => {
        console.log(`[HEARTBEAT] nucleus alive`, msg);
      },
    );

    console.log("Nucleus runtime initialized.");

    return runtime;
  }
}
