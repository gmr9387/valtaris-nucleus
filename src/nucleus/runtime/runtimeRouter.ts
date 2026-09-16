// src/nucleus/runtime/runtimeRouter.ts
//
// The authoritative enforcement point the codebase has referenced
// (subsystemRegistry.ts's own header: "the authoritative registry
// RuntimeRouter ... expects") without ever actually containing --
// there was no runtimeRouter.ts file anywhere in this snapshot before
// this one. In its absence, OSPipeline.dispatch() had quietly grown
// into the router itself: subsystem lookup, the enabled/disabled
// check, and contract validation were all inlined in a free function
// inside osPipeline.ts. That's moved here, and OSPipeline now calls
// this instead of doing its own enforcement.
//
// RuntimeRouter owns, in one place: subsystem lookup + enabled check
// (via RuntimeGuards), governed dispatch (calling the subsystem's own
// runtime.handle()), and contract validation of what comes back. A
// subsystem that's missing, disabled, or returns a payload that fails
// its stage's contract stops the claim here -- OSPipeline no longer
// needs to know any of that is even happening.

import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import type { SubsystemId } from "../subsystems/subsystemRegistry";
import { RuntimeGuards } from "./runtimeGuards";
import { validateContract } from "../contracts/contractRegistry";
import { nucleusState } from "../state/stateEngine";
import { nucleusMetrics } from "../metrics/metricsEngine";
// Side-effect import: registers the five per-stage contract
// definitions (opportunity/recommendation/authorization/execution/
// payment @ v1) against contractRegistry.ts. Without this,
// validateContract() below finds nothing registered and every stage
// fails validation.
import "../contracts";
import type { Dynamic } from "../types/dynamic";

const DEFAULT_CONTRACT_VERSION = "v1";

/**
 * registerAllSubsystems() is idempotent (it just re-populates a Map),
 * called here so the registry is guaranteed populated wherever
 * RuntimeRouter is used -- including tests that import it directly
 * without going through DeploymentBootstrap first.
 */
registerAllSubsystems();

export class RuntimeRouter {
  /**
   * Governed dispatch: resolve + authorize the subsystem, run its
   * handler for this contract stage, then validate the result against
   * that stage's registered contract before handing it back.
   */
  static async dispatch(
    id: SubsystemId,
    contractName: string,
    payload: Dynamic,
    contractVersion: string = DEFAULT_CONTRACT_VERSION,
  ): Promise<Dynamic> {
    const subsystem = RuntimeGuards.enforceSubsystemPermission(id);

    const startedAt = Date.now();
    const result = await subsystem.runtime.handle(contractName, payload);
    const durationMs = Date.now() - startedAt;

    const validation = validateContract(contractName, contractVersion, result);
    if (!validation.ok) {
      throw new Error(
        `RuntimeRouter: "${contractName}@${contractVersion}" output failed contract validation: ${(validation.errors ?? []).join("; ")}`,
      );
    }

    // StateEngine (src/nucleus/state/stateEngine.ts) fully implements
    // three separate items gapMap.md still lists as missing -- a
    // central state store, a diff engine (every set() auto-records a
    // before/after StateDiff), and a snapshot engine -- with a single
    // real caller anywhere in the codebase (one boot-time write in
    // nucleusRuntime.ts). This is its second, and the first on the
    // actual claim path: every validated stage result becomes that
    // subsystem's current state for this org, with the diff and
    // snapshot that produces as a side effect, not a separate ask.
    const organizationId = (payload as Dynamic)?.organizationId ?? "unknown";
    nucleusState.set(organizationId, id, contractName, result);
    nucleusState.snapshot(organizationId, id);

    // metrics/metricsEngine.ts is the canonical metrics implementation
    // in this codebase now -- confirmed by checking real importers,
    // this repo actually has THREE parallel metrics modules
    // (metrics/metricsEngine.ts, integrations/nucleusMetrics.ts,
    // ops/nucleusMetrics.ts), all fully built, all with zero real
    // callers anywhere. This one matches the audit+billing convention
    // every other engine wired live this session already uses; the
    // other two are flagged, not touched, in this PR's description.
    // Dispatch latency per stage is a genuine metric this engine
    // family didn't have anywhere else (telemetry carries the business
    // event, state carries the current value, this carries how long
    // the subsystem actually took).
    nucleusMetrics.record(organizationId, id, `dispatch.${contractName}.duration_ms`, durationMs);

    return result;
  }
}
