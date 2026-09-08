// src/nucleus/deployment/bootstrap.ts

import { Constitution } from "../constitution";
import { APIServer } from "../api/apiServer";
import { nucleusBoot } from "../runtime/nucleusBoot";

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
  static start(organizationId: string) {
    console.log("=== Valtaris Nucleus Boot Sequence ===");

    // 1. Load Constitution (kept for the startup log; nucleusBoot()
    //    also performs constitutional init internally via constitutionBoot()).
    console.log("Constitution:", Constitution.describe());

    // 2. Run the real unified boot sequence: constitutional init +
    //    subsystem registration + runtime creation, all in one place.
    //    NOTE: "nucleus" here is the orchestrator identity -- see the
    //    known-issue comment above regarding per-subsystem dispatch.
    const runtime = nucleusBoot("nucleus", organizationId);

    // 3. Start API server
    APIServer.start(3000);

    console.log("Nucleus runtime initialized.");

    return runtime;
  }
}
