// src/nucleus/tests/executionPaymentSafety.test.ts

import { describe, it, test, expect } from "vitest";

/**
 * Execution & Payment Safety Tests (Phase 8.4)
 *
 * Verifies:
 *   - execution must match authorization intent
 *   - payment must match execution amount
 */

import { NucleusApi } from "../api/nucleusApi";

describe("Execution & payment safety", () => {
  const orgId = "org-safety";

  it("blocks execution when executionType mismatches authorization", () => {
    const guardian = new NucleusApi("guardian", orgId);
    guardian.emit("authorization", "v1", {
      id: "auth-safe-1",
      recommendationId: "rec-safe-1",
      opportunityId: "opp-safe-1",
      organizationId: orgId,
      payload: { executionType: "standard" },
    });

    const glue = new NucleusApi("glue", orgId);

    expect(() =>
      glue.emit("execution", "v1", {
        id: "exec-safe-1",
        authorizationId: "auth-safe-1",
        recommendationId: "rec-safe-1",
        opportunityId: "opp-safe-1",
        organizationId: orgId,
        executionType: "dangerous", // mismatch
        payload: { amount: 100 },
      }),
    ).toThrow();
  });

  it("blocks payment when amount mismatches execution", () => {
    const guardian = new NucleusApi("guardian", orgId);
    guardian.emit("authorization", "v1", {
      id: "auth-safe-2",
      recommendationId: "rec-safe-2",
      opportunityId: "opp-safe-2",
      organizationId: orgId,
      payload: { executionType: "standard" },
    });

    const glue = new NucleusApi("glue", orgId);
    glue.emit("execution", "v1", {
      id: "exec-safe-2",
      authorizationId: "auth-safe-2",
      recommendationId: "rec-safe-2",
      opportunityId: "opp-safe-2",
      organizationId: orgId,
      executionType: "standard",
      payload: { amount: 100 },
    });

    const dualpay = new NucleusApi("dualpay", orgId);

    expect(() =>
      dualpay.emit("payment", "v1", {
        id: "pay-safe-2",
        executionId: "exec-safe-2",
        authorizationId: "auth-safe-2",
        recommendationId: "rec-safe-2",
        opportunityId: "opp-safe-2",
        organizationId: orgId,
        amount: 999, // mismatch
      }),
    ).toThrow();
  });
});
