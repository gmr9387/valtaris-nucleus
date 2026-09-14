// src/nucleus/runtime/osWorkflowEngine.ts

/**
 * OSWorkflowEngine (Phase 15)
 *
 * Thin wrapper around OSPipeline.
 * Ensures stable OS-level return shape.
 */

import { OSPipeline } from "./osPipeline";
import type { Dynamic } from "../types/dynamic";

export class OSWorkflowEngine {
  static async processClaim(organizationId: string, claimPayload: Record<string, Dynamic>) {
    const pipeline = await OSPipeline.runClaim(organizationId, claimPayload);

    return {
      status: "completed",
      claimId: pipeline.claimId,
      organizationId,
      pipeline,
    };
  }
}
