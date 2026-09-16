// Regression coverage for guardianRuntime.ts's resolveContractAndPlan().
// Previously this always adjudicated against demoContract/demoPlan no
// matter what -- the real per-payer contract lookup and plan-benefits
// lookup already existed and were wired into ClaimsWorkbench.tsx, but
// never into this, the Nucleus event API's own live adjudication path.

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

// Guardian checks the kill switch before any of the above -- keep it
// off so these tests exercise resolveContractAndPlan() as before.
vi.mock("@/lib/guardian-kill-switch", () => ({
  fetchKillSwitch: () =>
    Promise.resolve({ active: false, reason: null, activated_by: null, updated_at: "" }),
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

describe("guardianRuntime — resolveContractAndPlan (real contract/plan lookup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to demo contract/plan when claimPayload has no payer_name", async () => {
    fetchMemberAccumulators.mockResolvedValueOnce(accumulators());
    saveMemberAccumulators.mockResolvedValueOnce(undefined);

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "g1",
      organizationId: "org-1",
      claimPayload: { amount: 100, memberId: "M1", procedure_code: "99213" },
    });

    expect(result.usedDemoContract).toBe(true);
    expect(result.usedDemoPlan).toBe(true);
    expect(findActiveContractIdForPayer).not.toHaveBeenCalled();
  });

  it("uses the real contract and plan when a payer_name resolves to real data", async () => {
    fetchMemberAccumulators.mockResolvedValueOnce(accumulators());
    saveMemberAccumulators.mockResolvedValueOnce(undefined);
    findActiveContractIdForPayer.mockResolvedValueOnce("CTR-REAL");
    fetchContractTerms.mockResolvedValueOnce(realContract);
    findActivePlanIdForPayer.mockResolvedValueOnce("PLAN-REAL");
    fetchPlanBenefitTerms.mockResolvedValueOnce(realPlan);

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "g2",
      organizationId: "org-1",
      claimPayload: { amount: 100, memberId: "M1", procedure_code: "99213", payer_name: "Aetna" },
    });

    expect(result.usedDemoContract).toBe(false);
    expect(result.usedDemoPlan).toBe(false);
    // Real fee schedule caps 99213 at 5000 cents, not demo's 12000 --
    // proves adjudication actually ran against the real contract.
    expect(result.adjudication.allowed).toBe(5000);
  });

  it("falls back to demo contract/plan when a payer_name doesn't resolve to any real contract", async () => {
    fetchMemberAccumulators.mockResolvedValueOnce(accumulators());
    saveMemberAccumulators.mockResolvedValueOnce(undefined);
    findActiveContractIdForPayer.mockResolvedValueOnce(null);
    findActivePlanIdForPayer.mockResolvedValueOnce(null);

    const result = await GuardianRuntime.handle("authorization", {
      claimId: "g3",
      organizationId: "org-1",
      claimPayload: {
        amount: 100,
        memberId: "M1",
        procedure_code: "99213",
        payer_name: "Unknown Payer",
      },
    });

    expect(result.usedDemoContract).toBe(true);
    expect(result.usedDemoPlan).toBe(true);
    expect(fetchContractTerms).not.toHaveBeenCalled();
  });
});
