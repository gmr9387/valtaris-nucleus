// src/nucleus/tests/guardianConstitutionalLineage.test.ts
//
// FIXED: this file previously only asserted decision was in
// ["allow", "deny"] and reason was a non-empty string -- true for
// every possible outcome, so it couldn't catch a real regression in
// any specific branch. Rewritten with the same mocking pattern as
// guardianContractPlan.test.ts to assert real input -> outcome
// guarantees for each of Guardian's distinct decision paths: kill
// switch active, kill switch unreachable, accumulator fetch failure,
// and the demo-fallback caveat now surfaced in `reason` itself.

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ContractTerms, MemberAccumulators, PlanBenefits } from "@/types/claim";

const fetchMemberAccumulators = vi.fn<() => Promise<MemberAccumulators | null>>();
const saveMemberAccumulators = vi.fn<() => Promise<void>>();
vi.mock("../subsystems/guardian/adjudication/accumulatorRepository", () => ({
  fetchMemberAccumulators: () => fetchMemberAccumulators(),
  saveMemberAccumulators: () => saveMemberAccumulators(),
}));

const findActiveContractIdForPayer = vi.fn<() => Promise<string | null>>();
const fetchContractTerms = vi.fn<() => Promise<ContractTerms | null>>();
vi.mock("@/engine/contract-to-terms", () => ({
  findActiveContractIdForPayer: () => findActiveContractIdForPayer(),
  fetchContractTerms: () => fetchContractTerms(),
}));

const findActivePlanIdForPayer = vi.fn<() => Promise<string | null>>();
const fetchPlanBenefitTerms = vi.fn<() => Promise<PlanBenefits | null>>();
vi.mock("@/engine/plan-benefits-to-terms", () => ({
  findActivePlanIdForPayer: () => findActivePlanIdForPayer(),
  fetchPlanBenefitTerms: () => fetchPlanBenefitTerms(),
}));

const fetchKillSwitch = vi.fn<
  () => Promise<{
    active: boolean;
    reason: string | null;
    activated_by: string | null;
    updated_at: string;
  }>
>();
vi.mock("@/lib/guardian-kill-switch", () => ({
  fetchKillSwitch: () => fetchKillSwitch(),
}));

const { GuardianRuntime } = await import("../subsystems/guardian/guardianRuntime");

function accumulators(): MemberAccumulators {
  return {
    member_id: "M1",
    plan_year: 2026,
    individual_deductible_used: 0,
    individual_deductible_max: 100000,
    family_deductible_used: 0,
    family_deductible_max: 300000,
    individual_oop_used: 0,
    individual_oop_max: 500000,
    family_oop_used: 0,
    family_oop_max: 1000000,
    benefit_limits: [],
  };
}

const realContract: ContractTerms = {
  contract_id: "CTR-REAL",
  contract_version: "1.0",
  provider_npi: "1234567890",
  effective_date: "2026-01-01",
  term_date: "2026-12-31",
  fee_schedule_id: "FS-REAL",
  fee_schedule: new Map([["99213", 5000]]),
  reimbursement_method: "fee_schedule",
};

const realPlan: PlanBenefits = {
  plan_id: "PLAN-REAL",
  plan_version: "1.0",
  plan_name: "Real Plan",
  plan_year: 2026,
  deductible_individual: 0,
  deductible_family: 0,
  oop_max_individual: 500000,
  oop_max_family: 1000000,
  coinsurance_rate: 0,
  cob_policy: "standard",
  covered_services: [],
};

describe("Guardian constitutional lineage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchKillSwitch.mockResolvedValue({
      active: false,
      reason: null,
      activated_by: null,
      updated_at: "",
    });
  });

  it("rejects contract names Guardian does not own", async () => {
    await expect(
      GuardianRuntime.handle("payment", { organizationId: "test-org" }),
    ).rejects.toThrow();
  });

  it("denies with the kill-switch reason, critical risk tier, when the kill switch is active", async () => {
    fetchKillSwitch.mockResolvedValue({
      active: true,
      reason: "manual freeze pending audit",
      activated_by: "ops@example.com",
      updated_at: "",
    });

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "lineage-kill-switch",
      organizationId: "test-org",
      claimPayload: { amount: 250, memberId: "M999" },
    });

    expect(result.decision).toBe("deny");
    expect(result.reason).toBe("Guardian kill switch is active: manual freeze pending audit");
    expect(result.risk_tier).toBe("critical");
    expect(fetchMemberAccumulators).not.toHaveBeenCalled();
  });

  it("fails closed (deny, critical) when the kill switch can't be verified", async () => {
    fetchKillSwitch.mockRejectedValue(new Error("network unreachable"));

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "lineage-kill-switch-error",
      organizationId: "test-org",
      claimPayload: { amount: 250, memberId: "M999" },
    });

    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("Unable to verify Guardian kill switch state");
    expect(result.risk_tier).toBe("critical");
  });

  it("fails closed (deny, critical) when member accumulators can't be verified", async () => {
    fetchMemberAccumulators.mockRejectedValue(new Error("db timeout"));

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "lineage-accumulator-error",
      organizationId: "test-org",
      claimPayload: { amount: 250, memberId: "M999" },
    });

    expect(result.decision).toBe("deny");
    expect(result.reason).toContain("Unable to verify member accumulators");
    expect(result.risk_tier).toBe("critical");
  });

  it("allows on real contract/plan data with no demo caveat in the reason, low risk tier", async () => {
    fetchMemberAccumulators.mockResolvedValueOnce(accumulators());
    saveMemberAccumulators.mockResolvedValueOnce(undefined);
    findActiveContractIdForPayer.mockResolvedValueOnce("CTR-REAL");
    fetchContractTerms.mockResolvedValueOnce(realContract);
    findActivePlanIdForPayer.mockResolvedValueOnce("PLAN-REAL");
    fetchPlanBenefitTerms.mockResolvedValueOnce(realPlan);

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "lineage-real",
      organizationId: "test-org",
      claimPayload: { amount: 100, memberId: "M1", procedure_code: "99213", payer_name: "Aetna" },
    });

    expect(result.decision).toBe("allow");
    expect(result.reason).not.toContain("DEMO");
    // Deductible not yet met (used: 0, max: $1000), so the full $50
    // allowed amount applies to deductible -- plan pays $0, member owes
    // the full $50. Real fee-schedule cap (5000 cents), not demo's.
    expect(result.reason).toBe("Adjudicated: plan pays $0.00, member owes $50.00");
    expect(result.adjudication.allowed).toBe(5000);
    expect(result.risk_tier).toBe("low");
  });

  it("allows on demo fallback data with the demo caveat visible in the reason, medium risk tier", async () => {
    fetchMemberAccumulators.mockResolvedValueOnce(accumulators());
    saveMemberAccumulators.mockResolvedValueOnce(undefined);

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "lineage-demo",
      organizationId: "test-org",
      claimPayload: { amount: 100, memberId: "M1", procedure_code: "99213" },
    });

    expect(result.decision).toBe("allow");
    expect(result.usedDemoContract).toBe(true);
    expect(result.usedDemoPlan).toBe(true);
    expect(result.reason).toContain(
      "[DEMO CONTRACT + DEMO PLAN -- no real payer contract or plan benefits on file]",
    );
    expect(result.risk_tier).toBe("medium");
  });
});
