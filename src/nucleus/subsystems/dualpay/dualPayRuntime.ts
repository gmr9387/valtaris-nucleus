import { eventBus } from "../../events/eventBus";
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
    return final;
  }
}
