// OS pipeline constitutional test (Phase 16)

import { describe, it, test, expect } from "vitest";

import { OSPipeline } from "../runtime/osPipeline";

describe("OSPipeline constitutional test", () => {
  test("runs full contract chain for a claim", async () => {
    const organizationId = "org-1";
    const claimPayload = { claimId: "claim-1", amount: 800 };

    const result = await OSPipeline.runClaim(organizationId, claimPayload);

    expect(result.claimId).toBe("claim-1");
    expect(result.organizationId).toBe("org-1");

    expect(result.opportunity).toBeDefined();
    expect(result.recommendation).toBeDefined();
    expect(result.authorization).toBeDefined();
    expect(result.execution).toBeDefined();
    expect(result.payment).toBeDefined();
  });
});
