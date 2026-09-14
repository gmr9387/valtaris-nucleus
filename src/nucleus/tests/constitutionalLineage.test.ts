// src/nucleus/tests/constitutionalLineage.test.ts

import { describe, it, test, expect } from "vitest";

/**
 * Constitutional Lineage Tests (Phase 8.1)
 *
 * Verifies:
 *   - full chain: opportunity → recommendation → authorization → execution → payment
 *   - finalization fails if chain is incomplete
 */

import { NucleusApi } from "../api/nucleusApi";

describe("Constitutional lineage", () => {
  it("produces a complete constitutional chain", () => {
    const orgId = "org-1";
    const api = new NucleusApi("weaver", orgId);

    api.emit("opportunity", "v1", { id: "opp-1", organizationId: orgId });
    api.emit("recommendation", "v1", {
      id: "rec-1",
      opportunityId: "opp-1",
      organizationId: orgId,
    });

    const guardian = new NucleusApi("guardian", orgId);
    guardian.emit("authorization", "v1", {
      id: "auth-1",
      recommendationId: "rec-1",
      opportunityId: "opp-1",
      organizationId: orgId,
    });

    const glue = new NucleusApi("glue", orgId);
    glue.emit("execution", "v1", {
      id: "exec-1",
      authorizationId: "auth-1",
      recommendationId: "rec-1",
      opportunityId: "opp-1",
      organizationId: orgId,
      executionType: "standard",
      payload: { amount: 100 },
    });

    const dualpay = new NucleusApi("dualpay", orgId);
    dualpay.emit("payment", "v1", {
      id: "pay-1",
      executionId: "exec-1",
      authorizationId: "auth-1",
      recommendationId: "rec-1",
      opportunityId: "opp-1",
      organizationId: orgId,
      amount: 100,
    });

    const lineage = dualpay.lineage();
    expect(lineage.opportunity).toBeDefined();
    expect(lineage.recommendation).toBeDefined();
    expect(lineage.authorization).toBeDefined();
    expect(lineage.execution).toBeDefined();
    expect(lineage.payment).toBeDefined();

    const final = dualpay.finalize();
    expect(final.ok).toBe(true);
  });

  it("fails finalization when chain is incomplete", () => {
    const orgId = "org-2";
    const api = new NucleusApi("weaver", orgId);

    api.emit("opportunity", "v1", { id: "opp-2", organizationId: orgId });

    const dualpay = new NucleusApi("dualpay", orgId);
    expect(() => dualpay.finalize()).toThrow();
  });
});
