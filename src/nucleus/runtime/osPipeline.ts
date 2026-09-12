// src/nucleus/runtime/osPipeline.ts

import { WeaverRuntime } from "../subsystems/weaver/weaverRuntime";
import { GuardianRuntime } from "../subsystems/guardian/guardianRuntime";
import { GlueRuntime } from "../subsystems/glue/glueRuntime";
import { DualPayRuntime } from "../subsystems/dualpay/dualPayRuntime";

import { TelemetryAdapter } from "../subsystems/telemetry/telemetryAdapter";

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
  static async runClaim(organizationId: string, claimPayload: Record<string, any>) {
    const claimId = claimPayload.claimId || `claim-${Date.now()}`;

    const base = { claimId, organizationId, claimPayload };

    // Weaver — Opportunity
    const opportunity = await WeaverRuntime.handle("opportunity", base);
    TelemetryAdapter.send("weaver.opportunity", opportunity);

    // Weaver — Recommendation
    const recommendation = await WeaverRuntime.handle("recommendation", {
      ...base,
      opportunity,
    });
    TelemetryAdapter.send("weaver.recommendation", recommendation);

    // Guardian — Authorization
    const authorization = await GuardianRuntime.handle("authorization", {
      ...base,
      opportunity,
      recommendation,
    });
    TelemetryAdapter.send("guardian.authorization", authorization);

    // Glue — Execution
    const execution = await GlueRuntime.handle("execution", {
      ...base,
      authorization,
      opportunity,
      recommendation,
    });
    TelemetryAdapter.send("glue.execution", execution);

    // DualPay — Payment
    const payment = await DualPayRuntime.handle("payment", {
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
  static async runClaimFromGateway(gatewayPayload: any) {
    const { organizationId, claimPayload } = gatewayPayload;
    return this.runClaim(organizationId, claimPayload);
  }
}
