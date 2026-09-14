// src/nucleus/subsystems/gateway/gatewayAdapter.ts

import { GatewayRuntime } from "./gatewayRuntime";
import type { Dynamic } from "../../types/dynamic";

export class GatewayAdapter {
  static ingress(organizationId: string, claimPayload: Record<string, Dynamic>) {
    return GatewayRuntime.handle("ingress", { organizationId, claimPayload });
  }
}
