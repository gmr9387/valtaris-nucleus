// src/nucleus/subsystems/gateway/gatewayEngine.ts

import type { Dynamic } from "../../types/dynamic";
export type GatewayInput = {
  organizationId: string;
  claimPayload: Record<string, Dynamic>;
};

export type GatewayOutput = {
  organizationId: string;
  claimPayload: Record<string, Dynamic>;
  normalized: boolean;
  timestamp: number;
};

export class GatewayEngine {
  static normalize(input: GatewayInput): GatewayOutput {
    const { organizationId, claimPayload } = input;

    // Ensure claimId exists
    const claimId =
      claimPayload.claimId || `claim-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    const normalizedPayload = {
      ...claimPayload,
      claimId,
    };

    return {
      organizationId,
      claimPayload: normalizedPayload,
      normalized: true,
      timestamp: Date.now(),
    };
  }
}
