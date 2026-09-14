// src/nucleus/subsystems/gateway/gatewayRuntime.ts

import { eventBus } from "../../events/eventBus";
import { GatewayEngine } from "./gatewayEngine";
import type { Dynamic } from "../../types/dynamic";

export class GatewayRuntime {
  static handle(contractName: string, payload: Dynamic) {
    switch (contractName) {
      case "ingress":
        return this.handleIngress(payload);

      default:
        throw new Error(`Gateway cannot handle contract: ${contractName}`);
    }
  }

  private static handleIngress(payload: Dynamic) {
    const normalized = GatewayEngine.normalize(payload);

    eventBus.emit("gateway.ingress.normalized", normalized);
    return normalized;
  }
}
