// OS workflow engine constitutional test (Phase 16)

import { describe, it, test, expect } from "vitest";

import { OSWorkflowEngine } from "../runtime/osWorkflowEngine";

describe("OSWorkflowEngine constitutional test", () => {
  test("returns stable OS-level result shape", async () => {
    const organizationId = "org-2";
    const claimPayload = { claimId: "claim-2", amount: 500 };

    const result = await OSWorkflowEngine.processClaim(organizationId, claimPayload);

    expect(result.status).toBe("completed");
    expect(result.claimId).toBe("claim-2");
    expect(result.organizationId).toBe("org-2");

    expect(result.pipeline).toBeDefined();
    expect(result.pipeline.opportunity).toBeDefined();
    expect(result.pipeline.recommendation).toBeDefined();
    expect(result.pipeline.authorization).toBeDefined();
    expect(result.pipeline.execution).toBeDefined();
    expect(result.pipeline.payment).toBeDefined();
  });
});
