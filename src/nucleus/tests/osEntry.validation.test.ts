// Phase 18 — OS Entry Validation Constitutional Test

import { describe, it, test, expect } from "vitest";

import { OSEntry } from "../runtime/osEntry";

describe("OS Entry Validation", () => {
  test("rejects invalid organizationId", () => {
    expect(() => OSEntry.processClaim(null as any, { claimId: "x", amount: 10 })).toThrow(
      "Invalid organizationId",
    );
  });

  test("rejects invalid claimPayload", () => {
    expect(() => OSEntry.processClaim("org", null as any)).toThrow("Invalid claimPayload");
  });

  test("rejects missing claimId", () => {
    expect(() => OSEntry.processClaim("org", { amount: 10 } as any)).toThrow("Invalid claimId");
  });

  test("rejects non-numeric amount", () => {
    expect(() => OSEntry.processClaim("org", { claimId: "x", amount: "bad" } as any)).toThrow(
      "Invalid claimPayload.amount",
    );
  });

  test("accepts valid claim", async () => {
    const result = await OSEntry.processClaim("org", { claimId: "x", amount: 10 });
    expect(result.status).toBe("completed");
  });
});
