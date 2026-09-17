import { eventBus } from "../../events/eventBus";
import { recordTelemetry } from "../../telemetry/telemetry";
import { DualPayEngine } from "./dualPayEngine";
import type { Dynamic } from "../../types/dynamic";

export class DualPayRuntime {
  static handle(contractName: string, payload: Dynamic) {
    switch (contractName) {
      case "payment":
        return this.handlePayment(payload);

      default:
        throw new Error(`DualPay cannot handle contract: ${contractName}`);
    }
  }

  private static handlePayment(payload: Dynamic) {
    const input = {
      claimId: payload.claimId,
      organizationId: payload.organizationId,
      execution: payload.execution,
      opportunity: payload.opportunity,
      authorization: payload.authorization,
      recommendation: payload.recommendation,
    };

    const result = DualPayEngine.react(input);

    const final = {
      ...payload,
      payment: {
        ...result,
        timestamp: Date.now(),
      },
    };

    eventBus.emit("dualpay.payment.processed", final);

    // FIXED: DualPay was the only one of the four real claim-processing
    // runtimes (weaver/guardian/glue all already do this, confirmed by
    // reading every call site) that didn't call recordTelemetry() --
    // meaning the payment stage, the one where money actually moves, had
    // no signal in telemetry/telemetry.ts's nucleusTelemetry.getAll() at
    // all. Not a missing feature so much as an inconsistency: the other
    // three stages of every single claim were represented, this one
    // silently wasn't.
    recordTelemetry("dualpay", "payment", final.claimId, final.organizationId, final);

    return final;
  }
}
