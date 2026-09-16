// src/nucleus/runtime/osPipeline.ts

import { getSubsystem, type SubsystemId } from "../subsystems/subsystemRegistry";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import { TelemetryAdapter } from "../subsystems/telemetry/telemetryAdapter";
import { validateContract } from "../contracts/contractRegistry";
// Side-effect import: registers the five per-stage contract definitions
// (opportunity/recommendation/authorization/execution/payment @ v1)
// against contractRegistry.ts. Without this, validateContract() below
// would find nothing registered and every stage would fail validation.
import "../contracts";
import type { Dynamic } from "../types/dynamic";

const CONTRACT_VERSION = "v1";

/**
 * FIXED: this previously imported WeaverRuntime/GuardianRuntime/
 * GlueRuntime/DualPayRuntime directly and called them by static
 * reference, completely bypassing subsystemRegistry.ts -- the registry
 * that registerAllSubsystems() populates on every real boot
 * (DeploymentBootstrap -> nucleusBoot()) had no reader anywhere in the
 * codebase (confirmed by grepping every call site of getSubsystem()).
 * That made each registration's `enabled` flag a no-op: disabling a
 * subsystem in the registry changed nothing about what actually ran.
 *
 * Dispatching through the registry here makes it load-bearing: a
 * disabled subsystem now genuinely stops claim processing, and adding a
 * new subsystem only requires registering it, not editing this file.
 *
 * registerAllSubsystems() is called here (idempotent -- it just
 * re-populates a Map) so the registry is guaranteed populated wherever
 * OSPipeline runs, including tests and CI that construct it directly
 * without going through DeploymentBootstrap first.
 */
registerAllSubsystems();

/**
 * FIXED: dispatch() called subsystem.runtime.handle() and returned its
 * result untouched -- the real constitutional contracts (see
 * contracts/index.ts) validated a shape that had never matched what
 * these runtimes actually produce, and were never even imported, so
 * validateContract() had nothing registered to check against. Every
 * stage's output now goes through the same validateContract() the
 * constitution's contract layer was built for, so a subsystem that
 * starts returning a malformed result (missing a required field, an
 * "allow" with no adjudication, a "deny" that still moves money) stops
 * the claim here instead of silently propagating into the next stage.
 */
async function dispatch(id: SubsystemId, contractName: string, payload: Dynamic): Promise<Dynamic> {
  const subsystem = getSubsystem(id);
  if (!subsystem) {
    throw new Error(`OSPipeline: subsystem "${id}" is not registered.`);
  }
  if (!subsystem.enabled) {
    throw new Error(`OSPipeline: subsystem "${id}" is disabled.`);
  }

  const result = await subsystem.runtime.handle(contractName, payload);

  const validation = validateContract(contractName, CONTRACT_VERSION, result);
  if (!validation.ok) {
    throw new Error(
      `OSPipeline: "${contractName}@${CONTRACT_VERSION}" output failed contract validation: ${(validation.errors ?? []).join("; ")}`,
    );
  }

  return result;
}

export class OSPipeline {
  /**
   * Core OS pipeline — called internally or via Gateway.
   *
   * FIXED: made async. GuardianRuntime.handle() is now genuinely
   * asynchronous (it fetches real member accumulator data from Supabase
   * before deciding authorization) -- without awaiting it here, Glue and
   * DualPay would have received a pending Promise object instead of the
   * real authorization result.
   */
  static async runClaim(organizationId: string, claimPayload: Record<string, Dynamic>) {
    const claimId = claimPayload.claimId || `claim-${Date.now()}`;

    const base = { claimId, organizationId, claimPayload };

    // Weaver — Opportunity
    const opportunity = await dispatch("weaver", "opportunity", base);
    TelemetryAdapter.send("weaver.opportunity", opportunity);

    // Weaver — Recommendation
    const recommendation = await dispatch("weaver", "recommendation", {
      ...base,
      opportunity,
    });
    TelemetryAdapter.send("weaver.recommendation", recommendation);

    // Guardian — Authorization
    const authorization = await dispatch("guardian", "authorization", {
      ...base,
      opportunity,
      recommendation,
    });
    TelemetryAdapter.send("guardian.authorization", authorization);

    // Glue — Execution
    const execution = await dispatch("glue", "execution", {
      ...base,
      authorization,
      opportunity,
      recommendation,
    });
    TelemetryAdapter.send("glue.execution", execution);

    // DualPay — Payment
    const payment = await dispatch("dualpay", "payment", {
      ...base,
      execution,
      authorization,
      opportunity,
      recommendation,
    });
    TelemetryAdapter.send("dualpay.payment", payment);

    return {
      claimId,
      organizationId,
      opportunity,
      recommendation,
      authorization,
      execution,
      payment,
    };
  }

  /**
   * Gateway entrypoint — Phase 23
   * Accepts normalized payload from GatewayRuntime.
   */
  static async runClaimFromGateway(gatewayPayload: Dynamic) {
    const { organizationId, claimPayload } = gatewayPayload;
    return this.runClaim(organizationId, claimPayload);
  }
}
