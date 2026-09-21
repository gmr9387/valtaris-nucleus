// src/nucleus/runtime/osPipeline.ts

import { RuntimeRouter } from "./runtimeRouter";
import { TelemetryAdapter } from "../subsystems/telemetry/telemetryAdapter";
import { NucleusDBBridge } from "../db/nucleusDBBridge";
import { DecisionEngine } from "../decision/engine";
import type { Dynamic } from "../types/dynamic";

const dbBridge = new NucleusDBBridge();

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

    // Decision — governed evaluation of Weaver + Guardian's real signals.
    //
    // FIXED: the decision engine (src/nucleus/decision/) previously had
    // zero real callers -- disconnected from actual claim processing,
    // exercised only by the CLI's `nucleus decision` command against a
    // hand-written context.json. It is wired in here as a real, named,
    // rule-based confirmation of Guardian's already-authoritative
    // decision -- it does NOT gate `execution`/`payment` below (Glue
    // already gates on `authorization` directly, and that real,
    // established behavior is left untouched) -- so this can never
    // introduce a second authority that might disagree with Guardian.
    // What it adds for real: an explicit governance-rule trail (which
    // named rule fired, if any) and a real blended confidence score,
    // both persisted below as part of this claim's lineage.
    const decision = new DecisionEngine(organizationId, "decision").evaluate({
      ...base,
      opportunity,
      recommendation,
      authorization,
    });
    TelemetryAdapter.send("decision.evaluate", decision);

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

    // FIXED: nucleus_lineage was a real table with a real writer
    // (NucleusDBBridge.insertLineage) that nothing ever called -- a
    // finished claim's full stage chain never reached Supabase, so
    // `nucleus lineage <org>` had nothing real to show. Fire-and-forget
    // (not awaited) so a Supabase hiccup can never add latency to, or
    // fail, real claim processing -- lineage is a record OF the claim
    // result, not an input to it.
    const chain = [
      { stage: "weaver.opportunity", result: opportunity },
      { stage: "weaver.recommendation", result: recommendation },
      { stage: "guardian.authorization", result: authorization },
      { stage: "decision.evaluate", result: decision },
      { stage: "glue.execution", result: execution },
      { stage: "dualpay.payment", result: payment },
    ];
    dbBridge
      .insertLineage(organizationId, chain, true)
      .catch((err) => console.error("[OSPipeline] lineage persist failed (non-fatal)", err));

    return {
      claimId,
      organizationId,
      opportunity,
      recommendation,
      authorization,
      decision,
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
