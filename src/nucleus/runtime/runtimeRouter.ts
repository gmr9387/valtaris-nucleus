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
import { lineageEngine } from "../lineage/lineageEngine";
import { constitution } from "../constitution/constitution";
import { resourceGraph } from "../resources/resourceGraph";
import type { ResourceIdentity } from "../resources/resourceIdentity";
import type { NucleusSubsystem } from "../identity/nucleusIdentity";
import { structuralEquals } from "./structuralEquals";
// Side-effect import: registers the five per-stage contract
// definitions (opportunity/recommendation/authorization/execution/
// payment @ v1) against contractRegistry.ts. Without this,
// validateContract() below finds nothing registered and every stage
// fails validation.
import "../contracts";
import type { Dynamic } from "../types/dynamic";

const DEFAULT_CONTRACT_VERSION = "v1";
const NUCLEUS_SUBSYSTEMS: readonly NucleusSubsystem[] = ["weaver", "guardian", "glue", "dualpay"];

// Stages that consume Guardian's authorization decision as an input,
// keyed by (subsystem id, contract name) so this only ever gates the
// two real constitutional consumers -- Glue's execution and DualPay's
// payment -- not any future subsystem that happens to register a
// contract also named "execution" or "payment".
const GUARDIAN_GATED_STAGES: ReadonlySet<string> = new Set(["glue.execution", "dualpay.payment"]);

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
    const subsystem = RuntimeGuards.enforceSubsystemPermission(id, payload);

    // Law 6 (Boundary Integrity), enforced rather than assumed: Glue's
    // "execution" and DualPay's "payment" both take payload.authorization
    // as an input, but until now nothing verified that object actually
    // came from a real guardian.authorization dispatch for this claim --
    // GlueRuntime.handleExecution() and dualPayRuntime.ts's handler both
    // just trust whatever the caller put in the payload. A hand-built
    // payload with a fabricated `{ decision: "allow" }` would pass
    // executionContract.ts's own validate() (it only checks internal
    // consistency: "executed" requires authorization.decision === "allow",
    // not that the authorization is genuine) and execute. This rejects
    // that before the subsystem's handle() ever runs.
    if (GUARDIAN_GATED_STAGES.has(`${id}.${contractName}`)) {
      RuntimeRouter.enforceGuardianProvenance(id, contractName, payload);
    }

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

    // Claim-scoped (not just org-scoped) so two claims for the same org
    // in flight at once can't clobber each other's provenance record --
    // nucleusState's general (org, subsystem, key) keying is per-org, but
    // this specific record exists only to answer "is this the real
    // authorization for *this* claim?", so it's keyed by claimId too.
    if (id === "guardian" && contractName === "authorization") {
      const claimId = (payload as Dynamic)?.claimId;
      if (claimId) {
        nucleusState.set(organizationId, "guardian", `authorization:${claimId}`, result);
      }
    }

    // metrics/metricsEngine.ts is the canonical metrics implementation
    // for dispatch-latency timeseries. It once had a genuine dead
    // duplicate, integrations/nucleusMetrics.ts (a fully-built
    // eventBus-subscriber aggregator with zero real callers anywhere,
    // orphaned once eventBus.ts's own reconciliation removed its only
    // caller) -- deleted, not just flagged, since confirming zero
    // callers made it safe to remove outright rather than leave as
    // confusing duplication. ops/nucleusMetrics.ts's NucleusMetrics is
    // not a third duplicate of this: it's a distinct, smaller counters
    // utility genuinely wired into nucleusDiagnostics.ts (health/
    // autonomy/CLI real callers), not a timeseries engine. Dispatch
    // latency per stage is a genuine metric this engine family didn't
    // have anywhere else (telemetry carries the business event, state
    // carries the current value, this carries how long the subsystem
    // actually took).
    nucleusMetrics.record(organizationId, id, `dispatch.${contractName}.duration_ms`, durationMs);

    // lineage/lineageEngine.ts records the same real dispatch this
    // method already validated, under the real organizationId as
    // tenantId. NucleusIdentity only recognizes the four
    // claim-processing subsystems as valid "subsystem" values, so
    // "contracts"/"telemetry" dispatches -- neither on the real claim
    // path today -- are skipped rather than force-cast.
    if ((NUCLEUS_SUBSYSTEMS as readonly string[]).includes(id)) {
      const claimId = (payload as Dynamic)?.claimId;
      lineageEngine.recordEvent(
        {
          type: contractName,
          version: contractVersion,
          payload: result,
          source: id,
          context: {
            tenantId: organizationId,
            environmentId: process.env.NODE_ENV ?? "development",
            projectId: "nucleus",
            subsystem: id as NucleusSubsystem,
            capability: contractName,
          },
          timestamp: new Date().toISOString(),
        },
        claimId,
        "claim",
      );

      // gapMap.md's ResourceGraph gap: an earlier pass this session
      // concluded resourceGuards.ts's identity-boundary guard "assumes
      // one resource belongs to a single fixed (subsystem, capability)
      // pair, which doesn't fit a claim four different subsystems each
      // touch once with a different capability" -- that reasoning
      // modeled it as one resource crossing subsystems. Rereading
      // constitution.ts's own resources[] table shows the real model:
      // four separate resource *types*, each already constitutionally
      // declared with exactly one owning (subsystem, capability) pair
      // (OpportunityResource -> weaver.discover, AuthorizationResource
      // -> guardian.authorize, WorkflowResource -> glue.bind,
      // PaymentResource -> dualpay.charge) -- a fit for the guard, not a
      // mismatch. Each stage now creates (or, for weaver's two dispatches
      // per claim, mutates with the same declared identity) its own
      // claim-scoped resource, reusing the same tenantId/environmentId/
      // projectId derivation the lineage recording above already uses --
      // one identity shape, two real consumers.
      const resourceDef = constitution.resources.find((r) => r.subsystem === id);
      if (resourceDef) {
        const identity: ResourceIdentity = {
          tenantId: organizationId,
          environmentId: process.env.NODE_ENV ?? "development",
          projectId: "nucleus",
          subsystem: id,
          capability: resourceDef.capability,
        };
        const resourceId = `${organizationId}.${claimId}.${resourceDef.type}`;

        if (resourceGraph.getResource(resourceId)) {
          resourceGraph.mutateResource(resourceId, identity, () => result);
        } else {
          resourceGraph.createResource(resourceId, resourceDef.type, identity, result);
        }
      }
    }

    return result;
  }

  /**
   * Rejects a "glue.execution" or "dualpay.payment" dispatch whose
   * payload.authorization doesn't structurally match the real
   * guardian.authorization result this same claim already produced.
   * Fail-closed: a claim with no recorded Guardian dispatch yet (no
   * claimId, or Guardian genuinely hasn't run for this claim) is
   * rejected the same as a forged one -- there is no "trust it anyway"
   * path.
   */
  private static enforceGuardianProvenance(
    id: SubsystemId,
    contractName: string,
    payload: Dynamic,
  ): void {
    const organizationId = (payload as Dynamic)?.organizationId ?? "unknown";
    const claimId = (payload as Dynamic)?.claimId;
    const claimedAuthorization = (payload as Dynamic)?.authorization;

    const recorded = claimId
      ? nucleusState.get(organizationId, "guardian", `authorization:${claimId}`)
      : null;

    if (!recorded || !structuralEquals(recorded.value, claimedAuthorization)) {
      throw new Error(
        `RuntimeRouter: boundary violation on "${id}.${contractName}" -- payload.authorization does not match ` +
          `a real guardian.authorization dispatch result for claim "${claimId ?? "(missing claimId)"}". ` +
          `Constitutional Law 6 (Boundary Integrity): "Nucleus never bypasses Guardian."`,
      );
    }
  }
}
