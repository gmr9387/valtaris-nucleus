// src/nucleus/runtime/osPipeline.ts

import { RuntimeRouter } from "./runtimeRouter";
import { TelemetryAdapter } from "../subsystems/telemetry/telemetryAdapter";
import type { Dynamic } from "../types/dynamic";

/**
 * FIXED (historical): this previously imported WeaverRuntime/
 * GuardianRuntime/GlueRuntime/DualPayRuntime directly and called them
 * by static reference, completely bypassing the subsystem registry --
 * a disabled subsystem's `enabled` flag was a no-op. Dispatch was then
 * moved to a free function inline in this file that read the registry
 * itself, validated contracts itself, and enforced enabled/disabled
 * itself -- which meant OSPipeline had quietly become the router it
 * was supposed to be calling. All of that now lives in
 * RuntimeRouter.dispatch() (subsystem lookup + enabled check via
 * RuntimeGuards, governed handle(), contract validation of the
 * result) -- OSPipeline's job is purely orchestrating the five-stage
 * sequence and its telemetry, not enforcing anything itself.
 */
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
    const opportunity = await RuntimeRouter.dispatch("weaver", "opportunity", base);
    TelemetryAdapter.send("weaver.opportunity", opportunity);

    // Weaver — Recommendation
    const recommendation = await RuntimeRouter.dispatch("weaver", "recommendation", {
      ...base,
      opportunity,
    });
    TelemetryAdapter.send("weaver.recommendation", recommendation);

    // Guardian — Authorization
    const authorization = await RuntimeRouter.dispatch("guardian", "authorization", {
      ...base,
      opportunity,
      recommendation,
    });
    TelemetryAdapter.send("guardian.authorization", authorization);

    // Glue — Execution
    const execution = await RuntimeRouter.dispatch("glue", "execution", {
      ...base,
      authorization,
      opportunity,
      recommendation,
    });
    TelemetryAdapter.send("glue.execution", execution);

    // DualPay — Payment
    const payment = await RuntimeRouter.dispatch("dualpay", "payment", {
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
