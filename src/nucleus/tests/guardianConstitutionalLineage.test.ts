// src/nucleus/tests/guardianConstitutionalLineage.test.ts

import { describe, it, expect } from "vitest";

import { GuardianRuntime } from "../subsystems/guardian/guardianRuntime";

describe("Guardian constitutional lineage", () => {
  it("produces a decision with a supporting reason for an authorization contract", async () => {
    const result = await GuardianRuntime.handle("authorization", {
      claimId: "lineage-001",
      organizationId: "test-org",
      claimPayload: { amount: 250, memberId: "M999" },
    });

    expect(["allow", "deny"]).toContain(result.decision);
    expect(typeof result.reason).toBe("string");
    expect(result.reason.length).toBeGreaterThan(0);
    expect(typeof result.timestamp).toBe("number");
  });

  it("rejects contract names Guardian does not own", async () => {
    await expect(
      GuardianRuntime.handle("payment", { organizationId: "test-org" }),
    ).rejects.toThrow();
  });
});
