// Real regression coverage for the adjudication calculation engine
// (src/nucleus/subsystems/guardian/adjudication/calculationEngine.ts).
// This is the actual dollar-amount math behind every claim -- it had
// zero test coverage before this file, despite being the single most
// financially consequential piece of code in the app.

import { describe, it, expect } from "vitest";
import {
  adjudicateClaim,
  adjudicateLine,
  calculateAllowed,
  initSessionAccumulator,
  updateMemberAccumulators,
} from "../subsystems/guardian/adjudication/calculationEngine";
import type {
  ClaimLine,
  ContractTerms,
  PlanBenefits,
  MemberAccumulators,
  CoveredService,
} from "@/types/claim";

function makeLine(overrides: Partial<ClaimLine> = {}): ClaimLine {
  return {
    line_id: "L1",
    claim_id: "C1",
    service_date: "2026-01-15",
    claim_line_number: 1,
    procedure_code: "99213",
    diagnosis_codes: [],
    billed_amount: 10_000, // $100.00
    units: 1,
    place_of_service: "11",
    ...overrides,
  };
}

function makeContract(overrides: Partial<ContractTerms> = {}): ContractTerms {
  return {
    contract_id: "CT1",
    contract_version: "v1",
    provider_npi: "1234567890",
    effective_date: "2026-01-01",
    term_date: "2026-12-31",
    fee_schedule_id: "FS1",
    fee_schedule: new Map([["99213", 8_000]]), // $80.00 allowed
    reimbursement_method: "fee_schedule",
    ...overrides,
  };
}

function makePlan(overrides: Partial<PlanBenefits> = {}): PlanBenefits {
  return {
    plan_id: "P1",
    plan_version: "v1",
    plan_name: "Test Plan",
    plan_year: 2026,
    deductible_individual: 50_000,
    deductible_family: 100_000,
    oop_max_individual: 500_000,
    oop_max_family: 1_000_000,
    coinsurance_rate: 0.2,
    cob_policy: "standard",
    covered_services: [],
    ...overrides,
  };
}

function makeAccumulators(overrides: Partial<MemberAccumulators> = {}): MemberAccumulators {
  return {
    member_id: "M1",
    plan_year: 2026,
    individual_deductible_used: 0,
    individual_deductible_max: 50_000,
    family_deductible_used: 0,
    family_deductible_max: 100_000,
    individual_oop_used: 0,
    individual_oop_max: 500_000,
    family_oop_used: 0,
    family_oop_max: 1_000_000,
    benefit_limits: [],
    ...overrides,
  };
}

describe("calculateAllowed", () => {
  it("caps at the fee schedule amount for fee_schedule contracts", () => {
    const contract = makeContract();
    expect(calculateAllowed(makeLine({ billed_amount: 10_000, units: 1 }), contract)).toBe(8_000);
  });

  it("caps at billed amount when fee schedule allows more than billed", () => {
    const contract = makeContract({ fee_schedule: new Map([["99213", 20_000]]) });
    expect(calculateAllowed(makeLine({ billed_amount: 10_000 }), contract)).toBe(10_000);
  });

  it("returns 0 when the procedure isn't in the fee schedule", () => {
    const contract = makeContract({ fee_schedule: new Map() });
    expect(calculateAllowed(makeLine(), contract)).toBe(0);
  });

  it("applies percent_of_billed and rounds to whole cents", () => {
    const contract = makeContract({
      reimbursement_method: "percent_of_billed",
      percent_of_billed: 0.75,
    });
    expect(calculateAllowed(makeLine({ billed_amount: 10_001 }), contract)).toBe(
      Math.round(10_001 * 0.75),
    );
  });
});

describe("adjudicateLine — normal payment split", () => {
  it("applies deductible then coinsurance and balances the invariant", () => {
    const line = makeLine();
    const contract = makeContract();
    const plan = makePlan();
    const accumulators = makeAccumulators();
    const sessionAcc = initSessionAccumulator(accumulators);

    const { result } = adjudicateLine(line, sessionAcc, contract, plan, [], [], []);

    // allowed = 8000. All of it goes to deductible (50000 remaining).
    expect(result.allowed).toBe(8_000);
    expect(result.deductible_applied).toBe(8_000);
    expect(result.coinsurance).toBe(0);
    expect(result.plan_paid).toBe(0);
    expect(result.member_responsibility).toBe(8_000);
    expect(result.status).toBe("deductible_applied");
  });

  it("splits coinsurance correctly once the deductible is met", () => {
    const line = makeLine();
    const contract = makeContract();
    const plan = makePlan({ coinsurance_rate: 0.2 });
    // Deductible already fully met.
    const accumulators = makeAccumulators({
      individual_deductible_used: 50_000,
      individual_deductible_max: 50_000,
    });
    const sessionAcc = initSessionAccumulator(accumulators);

    const { result } = adjudicateLine(line, sessionAcc, contract, plan, [], [], []);

    expect(result.deductible_applied).toBe(0);
    // allowed=8000, coinsurance = 20% of 8000 = 1600, plan pays the rest.
    expect(result.coinsurance).toBe(1_600);
    expect(result.member_responsibility).toBe(1_600);
    expect(result.plan_paid).toBe(6_400);
    expect(result.status).toBe("paid");
    // plan_paid + member_responsibility must equal allowed.
    expect(result.plan_paid + result.member_responsibility).toBe(result.allowed);
  });
});

describe("adjudicateLine — denied (non-covered)", () => {
  it("bills the member in full when the procedure isn't in the fee schedule", () => {
    const line = makeLine({ billed_amount: 10_000 });
    const contract = makeContract({ fee_schedule: new Map() });
    const plan = makePlan();
    const sessionAcc = initSessionAccumulator(makeAccumulators());

    const { result } = adjudicateLine(line, sessionAcc, contract, plan, [], [], []);

    expect(result.status).toBe("denied");
    expect(result.plan_paid).toBe(0);
    expect(result.member_responsibility).toBe(10_000);
  });
});

describe("adjudicateLine — benefit limit exhausted", () => {
  const coveredService: CoveredService = {
    category: "physical_therapy",
    procedure_codes: ["97110"],
    requires_auth: false,
    benefit_limit: {
      benefit_category: "physical_therapy",
      period: "annual",
      used: 20,
      max: 20,
      unit: "visits",
    },
  };

  it("does NOT write off the allowed amount for free -- it becomes member responsibility", () => {
    // FIXED: this used to assert plan_paid=0 AND member_responsibility=0,
    // meaning the provider absorbed the entire contracted amount for
    // free once a benefit limit was hit. That was inconsistent with the
    // "denied" case above (member pays in full) and financially wrong:
    // reaching a benefit maximum shifts the plan's share to the member,
    // it doesn't make the visit free for everyone.
    const line = makeLine({ procedure_code: "97110", billed_amount: 12_000 });
    const contract = makeContract({ fee_schedule: new Map([["97110", 9_000]]) });
    const plan = makePlan({ covered_services: [coveredService] });
    const accumulators = makeAccumulators({
      benefit_limits: [
        {
          benefit_category: "physical_therapy",
          period: "annual",
          used: 20,
          max: 20,
          unit: "visits",
        },
      ],
    });
    const sessionAcc = initSessionAccumulator(accumulators);

    const { result } = adjudicateLine(line, sessionAcc, contract, plan, [], [], []);

    expect(result.status).toBe("benefit_limit_exhausted");
    expect(result.plan_paid).toBe(0);
    // rawAllowed (9000) becomes member responsibility, not 0.
    expect(result.member_responsibility).toBe(9_000);
  });
});

describe("adjudicateLine — out-of-pocket max protection", () => {
  it("caps member responsibility at the remaining OOP max and shifts the excess to the plan", () => {
    const line = makeLine({ billed_amount: 20_000 });
    const contract = makeContract({ fee_schedule: new Map([["99213", 20_000]]) });
    const plan = makePlan({ coinsurance_rate: 1 }); // 100% coinsurance to force a large member share
    // Only 500 cents of OOP room left.
    const accumulators = makeAccumulators({
      individual_deductible_used: 50_000,
      individual_deductible_max: 50_000,
      individual_oop_used: 499_500,
      individual_oop_max: 500_000,
    });
    const sessionAcc = initSessionAccumulator(accumulators);

    const { result } = adjudicateLine(line, sessionAcc, contract, plan, [], [], []);

    // allowed=20000, all coinsurance (100%), but OOP remaining is only 500.
    expect(result.member_responsibility).toBe(500);
    expect(result.plan_paid).toBe(20_000 - 500);
    expect(result.adjustments.some((a) => a.category === "oop_max")).toBe(true);
  });
});

describe("adjudicateClaim — totals and determinism", () => {
  it("sums line results into run totals and is deterministic across runs", () => {
    const lines = [makeLine({ line_id: "L1" }), makeLine({ line_id: "L2", claim_line_number: 2 })];
    const contract = makeContract();
    const plan = makePlan();
    const accumulators = makeAccumulators();

    const { run: run1 } = adjudicateClaim(lines, accumulators, contract, plan);
    const { run: run2 } = adjudicateClaim(lines, accumulators, contract, plan);

    expect(run1.line_results).toHaveLength(2);
    expect(run1.total_plan_paid).toBe(run1.line_results.reduce((s, r) => s + r.plan_paid, 0));
    expect(run1.total_member_responsibility).toBe(
      run1.line_results.reduce((s, r) => s + r.member_responsibility, 0),
    );

    // Deterministic: same inputs -> same outputs (ignoring run_id/timestamp
    // fields that are allowed to vary).
    expect(run1.total_plan_paid).toBe(run2.total_plan_paid);
    expect(run1.total_member_responsibility).toBe(run2.total_member_responsibility);
  });
});

describe("updateMemberAccumulators", () => {
  it("advances deductible/OOP usage so the next claim sees it consumed", () => {
    const line = makeLine();
    const contract = makeContract();
    const plan = makePlan();
    const accumulators = makeAccumulators();
    const sessionAcc = initSessionAccumulator(accumulators);

    const { result, nextAcc } = adjudicateLine(line, sessionAcc, contract, plan, [], [], []);
    expect(result.deductible_applied).toBe(8_000);

    const updated = updateMemberAccumulators(accumulators, nextAcc);

    // FIXED: previously nothing computed or persisted this at all --
    // every claim was adjudicated against the same starting snapshot
    // forever. This is the fold-back that makes deductible tracking
    // actually work across claims.
    expect(updated.individual_deductible_used).toBe(8_000);
    expect(updated.individual_deductible_max).toBe(accumulators.individual_deductible_max);

    // Feeding the updated accumulators into a second claim should now
    // see less deductible remaining.
    const secondSession = initSessionAccumulator(updated);
    expect(secondSession.deductible_remaining).toBe(50_000 - 8_000);
  });

  it("advances benefit-limit usage per category and leaves other categories untouched", () => {
    const accumulators = makeAccumulators({
      benefit_limits: [
        {
          benefit_category: "physical_therapy",
          period: "annual",
          used: 5,
          max: 20,
          unit: "visits",
        },
        { benefit_category: "chiropractic", period: "annual", used: 3, max: 12, unit: "visits" },
      ],
    });
    const session = initSessionAccumulator(accumulators);
    session.benefit_limits_remaining.set("physical_therapy", 10); // simulate 5 more visits consumed

    const updated = updateMemberAccumulators(accumulators, session);

    const pt = updated.benefit_limits.find((b) => b.benefit_category === "physical_therapy");
    const chiro = updated.benefit_limits.find((b) => b.benefit_category === "chiropractic");

    expect(pt?.used).toBe(10); // max(20) - remaining(10)
    expect(chiro?.used).toBe(3); // untouched
  });

  it("never touches family deductible/OOP -- this engine doesn't adjudicate against them", () => {
    const accumulators = makeAccumulators({
      family_deductible_used: 1_000,
      family_oop_used: 2_000,
    });
    const session = initSessionAccumulator(accumulators);
    session.deductible_remaining -= 5_000;
    session.oop_remaining -= 5_000;

    const updated = updateMemberAccumulators(accumulators, session);

    expect(updated.family_deductible_used).toBe(1_000);
    expect(updated.family_oop_used).toBe(2_000);
  });
});
