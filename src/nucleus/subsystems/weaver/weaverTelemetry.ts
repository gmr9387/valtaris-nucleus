// src/nucleus/subsystems/weaver/weaverTelemetry.ts

import { eventBus } from "../../events/eventBus";
import type { Dynamic } from "../../types/dynamic";

export class WeaverTelemetry {
  static emit(type: "opportunity" | "recommendation", payload: Dynamic) {
    eventBus.emit(`weaver.telemetry.${type}`, {
      timestamp: new Date().toISOString(),
      type,
      claimId: payload.claimId,
      organizationId: payload.organizationId,
      payload,
    });
  }
}
