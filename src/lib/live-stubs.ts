/**
 * Deliberately empty ContractTerms/PlanBenefits. Used only as a last
 * resort when production mode has no real uploaded contract for a claim's
 * payer and no plan-benefits table exists yet (see the KNOWN GAP note in
 * @/engine/contract-to-terms.ts) — never as a stand-in for real data that
 * should have been looked up. An empty fee schedule denies every line via
 * calculateAllowed's "no match found" path, which is the point: adjudicating
 * against this should be visibly wrong, not quietly plausible.
 */
import type { ContractTerms, PlanBenefits } from "@/types/claim";

export const LIVE_CONTRACT: ContractTerms = {
  contract_id: "",
  contract_version: "",
  provider_npi: "",
  effective_date: "",
  term_date: "",
  fee_schedule_id: "",
  fee_schedule: new Map(),
  reimbursement_method: "fee_schedule",
};

export const LIVE_PLAN: PlanBenefits = {
  plan_id: "",
  plan_version: "",
  plan_name: "",
  plan_year: 0,
  deductible_individual: 0,
  deductible_family: 0,
  oop_max_individual: 0,
  oop_max_family: 0,
  coinsurance_rate: 0,
  cob_policy: "standard",
  covered_services: [],
};
