// src/nucleus/subsystems/guardian/adjudication/demoContractPlan.ts
//
// IMPORTANT: this is DEMO data, vendored verbatim from DualPay's own
// src/data/demo-scenarios.ts (demoContract, demoPlan, createDemoFeeSchedule).
// It is not invented here -- these are the exact same values DualPay's
// own app currently uses, because DualPay does not yet have a real,
// Supabase-backed source of per-provider contract terms or per-plan
// benefit configuration. Member accumulators ARE real (see
// accumulatorRepository.ts) -- only contract/plan are still demo.
//
// Do not treat authorization decisions based on this data as reflecting
// a real provider contract or a real member's actual plan. Replace this
// file once DualPay has real contract/plan tables to query.

import type { ContractTerms, PlanBenefits } from "@/types/claim";

export function createDemoFeeSchedule(): Map<string, number> {
  const fs = new Map<string, number>();
  fs.set("99213", 12000);
  fs.set("99214", 18000);
  fs.set("99215", 25000);
  fs.set("99203", 15000);
  fs.set("99204", 22000);
  fs.set("85025", 3500);
  fs.set("80053", 4200);
  fs.set("71046", 9500);
  return fs;
}

export const demoContract: ContractTerms = {
  contract_id: "CTR-2024-001",
  contract_version: "2.1",
  provider_npi: "1234567890",
  effective_date: "2024-01-01",
  term_date: "2024-12-31",
  fee_schedule_id: "FS-STANDARD-2024",
  fee_schedule: createDemoFeeSchedule(),
  reimbursement_method: "fee_schedule",
};

export const demoPlan: PlanBenefits = {
  plan_id: "PLAN-GOLD-PPO",
  plan_version: "3.0",
  plan_name: "Gold PPO 1000",
  plan_year: 2024,
  deductible_individual: 100000,
  deductible_family: 300000,
  oop_max_individual: 500000,
  oop_max_family: 1000000,
  coinsurance_rate: 0.2,
  cob_policy: "standard",
  covered_services: [],
};
