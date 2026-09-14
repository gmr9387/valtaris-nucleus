import { eventBus } from "../../events/eventBus";
import { recordTelemetry } from "../../telemetry/telemetry";
import type { Dynamic } from "../../types/dynamic";

export class GlueRuntime {
  static handle(contractName: string, payload: Dynamic) {
    switch (contractName) {
      case "execution":
        return this.handleExecution(payload);

      default:
        throw new Error(`Glue cannot handle contract: ${contractName}`);
    }
  }

  private static handleExecution(payload: Dynamic) {
    const { authorization, recommendation } = payload;

    const decision = authorization?.decision ?? "deny";

    // FIXED: previously gated on authorization.decision alone.
    // Weaver's recommendation.action/confidence used to be hardcoded
    // constants ("approve"/0.7) that could never fail a gate, so
    // dropping the check was the honest call at the time (see the prior
    // note this replaces). weaverRuntime.ts now derives action/confidence
    // from real claim-data completeness instead -- "review" means Weaver
    // didn't have a real procedure code, diagnosis codes, or a positive
    // amount to work with. That's a real reason to hold execution even
    // when Guardian separately authorized the claim, since Guardian's
    // own adjudication (procedure-code-driven pricing) is only as good
    // as the same input data Weaver is flagging as incomplete.
    let status = "skipped";
    let reason = "Authorization denied";

    if (decision === "allow" && recommendation?.action === "review") {
      status = "skipped";
      reason = `Held for review: recommendation confidence ${recommendation.confidence} is below the auto-execute threshold`;
    } else if (decision === "allow") {
      status = "executed";
      reason = "Execution allowed";
    }

    const result = {
      ...payload,
      status,
      reason,
      timestamp: Date.now(),
    };

    eventBus.emit("glue.execution.processed", result);

    recordTelemetry("glue", "execution", result.claimId, result.organizationId, result);

    return result;
  }
}
