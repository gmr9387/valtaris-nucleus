// src/nucleus/tests/subsystemPermissions.test.ts

import { describe, it, test, expect } from "vitest";

/**
 * Subsystem Permission Tests (Phase 8.2)
 *
 * Verifies:
 *   - Weaver cannot emit authorization/payment
 *   - Guardian cannot emit opportunity/recommendation/payment
 *   - Glue cannot emit opportunity/recommendation/authorization/payment
 *   - DualPay cannot emit opportunity/recommendation/authorization/execution
 */

import { NucleusApi } from "../api/nucleusApi";

describe("Subsystem permissions", () => {
  const orgId = "org-perms";

  it("prevents Weaver from emitting unauthorized contracts", () => {
    const weaver = new NucleusApi("weaver", orgId);

    expect(() => weaver.emit("authorization", "v1", { organizationId: orgId })).toThrow();

    expect(() => weaver.emit("payment", "v1", { organizationId: orgId })).toThrow();
  });

  it("prevents Guardian from emitting non-authorization contracts", () => {
    const guardian = new NucleusApi("guardian", orgId);

    expect(() => guardian.emit("opportunity", "v1", { organizationId: orgId })).toThrow();

    expect(() => guardian.emit("recommendation", "v1", { organizationId: orgId })).toThrow();

    expect(() => guardian.emit("payment", "v1", { organizationId: orgId })).toThrow();
  });

  it("prevents Glue from emitting non-execution contracts", () => {
    const glue = new NucleusApi("glue", orgId);

    expect(() => glue.emit("opportunity", "v1", { organizationId: orgId })).toThrow();

    expect(() => glue.emit("authorization", "v1", { organizationId: orgId })).toThrow();

    expect(() => glue.emit("payment", "v1", { organizationId: orgId })).toThrow();
  });

  it("prevents DualPay from emitting non-payment contracts", () => {
    const dualpay = new NucleusApi("dualpay", orgId);

    expect(() => dualpay.emit("execution", "v1", { organizationId: orgId })).toThrow();

    expect(() => dualpay.emit("authorization", "v1", { organizationId: orgId })).toThrow();

    expect(() => dualpay.emit("opportunity", "v1", { organizationId: orgId })).toThrow();
  });
});
