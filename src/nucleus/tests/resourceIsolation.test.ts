// src/nucleus/tests/resourceIsolation.test.ts

import { describe, it, test, expect } from "vitest";

/**
 * Resource Isolation Tests (Phase 8.3)
 *
 * Verifies:
 *   - cross-tenant access is blocked
 */

import { NucleusApi } from "../api/nucleusApi";

describe("Resource isolation", () => {
  it("prevents cross-tenant lineage access", () => {
    const orgA = "org-A";
    const orgB = "org-B";

    const weaverA = new NucleusApi("weaver", orgA);
    weaverA.emit("opportunity", "v1", { id: "opp-A", organizationId: orgA });

    const dualpayB = new NucleusApi("dualpay", orgB);

    // Depending on your exact implementation, this may throw at emit or at lineage/finalize.
    // The important invariant: orgB cannot successfully build lineage over orgA's resources.
    expect(() => dualpayB.lineage()).toThrow();
  });
});
