// Phase 18 — OS Entry Validation Constitutional Test

import { describe, it, test, expect } from "vitest";

import { OSEntry } from "../runtime/osEntry";
import type { Dynamic } from "../types/dynamic";

describe("OS Entry Validation", () => {
  test("rejects invalid organizationId", () => {
    expect(() => OSEntry.processClaim(null as Dynamic, { claimId: "x", amount: 10 })).toThrow(
      "Invalid organizationId",
    );
  });

  test("rejects invalid claimPayload", () => {
    expect(() => OSEntry.processClaim("org", null as Dynamic)).toThrow("Invalid claimPayload");
  });

  test("rejects missing claimId", () => {
    expect(() => OSEntry.processClaim("org", { amount: 10 } as Dynamic)).toThrow("Invalid claimId");
  });

  test("rejects non-numeric amount", () => {
    expect(() => OSEntry.processClaim("org", { claimId: "x", amount: "bad" } as Dynamic)).toThrow(
      "Invalid claimPayload.amount",
    );
  });

  test("accepts valid claim", async () => {
    const result = await OSEntry.processClaim("org", { claimId: "x", amount: 10 });
    expect(result.status).toBe("completed");
  });
});
