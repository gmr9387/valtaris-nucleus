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
    const { authorization } = payload;

    const decision = authorization?.decision ?? "deny";

    // FIXED: previously also gated on recommendation.action !== "deny"
    // and recommendation.confidence >= 0.3. Both values are hardcoded
    // constants in weaverRuntime.ts ("approve" and 0.7, always) --
    // neither can ever fail this check today, so it looked like a real
    // secondary safety gate while providing zero actual signal.
    //
    // Guardian's authorization.decision is the only real signal in the
    // pipeline right now (it reflects actual adjudication against real
    // member accumulator data). Gating on it alone is honest about what
    // this system currently verifies.
    //
    // TODO: once Weaver's opportunity/recommendation scoring is based on
    // real claim risk signals instead of hardcoded values, reintroduce a
    // real confidence-based gate here -- don't just restore the old
    // condition, since the old thresholds (0.3) were never validated
    // against anything real either.
    let status = "skipped";
    let reason = "Authorization denied";

    if (decision === "allow") {
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
