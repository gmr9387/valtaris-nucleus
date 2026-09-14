// src/nucleus/tests/guardianConstitutionalSafety.test.ts

import { describe, it, expect } from "vitest";

import { getAllSubsystems } from "../subsystems/subsystemRegistry";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import { GuardianRuntime } from "../subsystems/guardian/guardianRuntime";

describe("Guardian constitutional safety", () => {
  it("is registered and enabled in the Constitution", () => {
    registerAllSubsystems();
    const guardian = getAllSubsystems().find((s) => s.id === "guardian");
    expect(guardian).toBeDefined();
    expect(guardian?.enabled).toBe(true);
  });

  it("only ever returns an allow/deny decision for an authorization contract", async () => {
    const result = await GuardianRuntime.handle("authorization", {
      claimId: "test-001",
      organizationId: "test-org",
      claimPayload: { amount: 100, memberId: "M123" },
    });

    expect(["allow", "deny"]).toContain(result.decision);
  });
});
