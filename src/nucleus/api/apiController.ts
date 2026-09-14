// src/nucleus/api/apiController.ts

import type { Request, Response } from "express";
import { GatewayAdapter } from "../subsystems/gateway/gatewayAdapter";
import { OSPipeline } from "../runtime/osPipeline";

export class APIController {
  /**
   * POST /claim
   * Main entrypoint for external organizations.
   */
  static submitClaim(req: Request, res: Response) {
    try {
      const { organizationId, claimPayload } = req.body;

      if (!organizationId || !claimPayload) {
        return res.status(400).json({
          error: "organizationId and claimPayload are required",
        });
      }

      // Step 1 — Gateway normalization
      const gatewayPayload = GatewayAdapter.ingress(organizationId, claimPayload);

      // Step 2 — OS pipeline execution
      const result = OSPipeline.runClaimFromGateway(gatewayPayload);

      return res.status(200).json(result);
    } catch (err: unknown) {
      return res.status(500).json({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
