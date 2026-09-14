// Regression coverage for the COB primacy engine
// (cobRules.ts: declaredOrderRule, birthdayRule, lengthOfCoverageRule,
// determineCOBPrimacy, resolveClaimPrimacy). Previously determineCOBPrimacy
// existed but had zero callers anywhere in the app -- claims with other
// health insurance on file were adjudicated as if this plan were the
// only payer, with no primacy determination at all. resolveClaimPrimacy
// is the wiring that closes that gap.

import { describe, it, expect } from "vitest";
import {
  declaredOrderRule,
  birthdayRule,
  lengthOfCoverageRule,
  determineCOBPrimacy,
  resolveClaimPrimacy,
  MEMBER_PLAN_ID,
} from "../subsystems/guardian/adjudication/cobRules";
import type { OHIIndicator } from "@/types/claim";

function indicator(overrides: Partial<OHIIndicator> & { payer_id: string }): OHIIndicator {
  return {
    payer_name: overrides.payer_id,
    coverage_type: "medical",
    ...overrides,
  };
}

describe("resolveClaimPrimacy", () => {
  it("returns primary when there are no OHI indicators at all", () => {
    const result = resolveClaimPrimacy([]);
    expect(result.status).toBe("primary");
  });

  it("returns secondary when an indicator declares primacy_order 1", () => {
    const indicators = [
      indicator({ payer_id: "PAYER-A", payer_name: "Acme Health", primacy_order: 1 }),
    ];
    const result = resolveClaimPrimacy(indicators);

    expect(result.status).toBe("secondary");
    if (result.status === "secondary") {
      expect(result.primary_payer_id).toBe("PAYER-A");
      expect(result.primary_payer_name).toBe("Acme Health");
      expect(result.rule_id).toBe("COB_DECLARED_001");
    }
  });

  it("returns primary by elimination when no indicator declares primacy_order 1", () => {
    const indicators = [indicator({ payer_id: "PAYER-B", primacy_order: 2 })];
    const result = resolveClaimPrimacy(indicators);
    expect(result.status).toBe("primary");
  });

  it("returns unknown when indicators exist but no rule pack can resolve primacy", () => {
    const indicators = [indicator({ payer_id: "PAYER-C" })]; // no primacy_order, no DOB context
    const result = resolveClaimPrimacy(indicators);
    expect(result.status).toBe("unknown");
  });

  it("declared order takes priority over the birthday rule when both apply", () => {
    const indicators = [
      indicator({ payer_id: "PAYER-D", payer_name: "Delta Health", primacy_order: 1 }),
    ];
    const context = { member_dob: "1990-01-01", spouse_dob: "1990-06-01" };
    const result = resolveClaimPrimacy(indicators, context);

    expect(result.status).toBe("secondary");
    if (result.status === "secondary") {
      expect(result.rule_id).toBe("COB_DECLARED_001");
    }
  });

  it("falls back to the birthday rule when no declared order is present", () => {
    // Member's birthday (01-01) is earlier in the calendar year than the
    // spouse's (06-01) -- member_plan is primary under the Birthday Rule.
    const indicators = [indicator({ payer_id: "SPOUSE-PAYER", payer_name: "Spouse Co" })];
    const context = { member_dob: "1990-01-01", spouse_dob: "1990-06-01" };
    const result = resolveClaimPrimacy(indicators, context);

    expect(result.status).toBe("primary");
  });

  it("resolves to secondary via the birthday rule when the spouse's plan is primary", () => {
    const indicators = [indicator({ payer_id: "SPOUSE-PAYER", payer_name: "Spouse Co" })];
    const context = { member_dob: "1990-06-01", spouse_dob: "1990-01-01" };
    const result = resolveClaimPrimacy(indicators, context);

    // spouse_plan is synthetic and doesn't match any real indicator's
    // payer_id, matching the birthday rule's existing (pre-existing)
    // simplification for dependent dual-coverage scenarios.
    expect(result.status).toBe("secondary");
    if (result.status === "secondary") {
      expect(result.primary_payer_id).toBe("spouse_plan");
    }
  });
});

describe("declaredOrderRule", () => {
  it("is registered ahead of birthdayRule and lengthOfCoverageRule by priority", () => {
    expect(declaredOrderRule.priority).toBeLessThan(birthdayRule.priority);
    expect(declaredOrderRule.priority).toBeLessThan(lengthOfCoverageRule.priority);
  });

  it("returns null (defers) when no indicator carries a primacy_order", () => {
    const indicators = [indicator({ payer_id: "PAYER-E" })];
    expect(declaredOrderRule.evaluate(indicators, {})).toBeNull();
  });
});

describe("determineCOBPrimacy — default rule packs include declaredOrderRule", () => {
  it("resolves primacy from an explicit primacy_order without any context", () => {
    const indicators = [
      indicator({ payer_id: "PAYER-F", payer_name: "Foxtrot Health", primacy_order: 1 }),
    ];
    const result = determineCOBPrimacy(indicators, {});

    expect(result).not.toBeNull();
    expect(result?.primary_payer_id).toBe("PAYER-F");
    expect(result?.secondary_payer_id).toBe(MEMBER_PLAN_ID);
  });
});
