// Row shape for the plan_benefits table.
// @/engine/plan-benefits-to-terms.ts converts this into the PlanBenefits
// shape the adjudication engine (@/types/claim) actually consumes.

import type { COBPolicyType, CoveredService } from "./claim";

export interface PlanBenefitRow {
  plan_id: string;
  payer_name: string;
  plan_name: string;
  version: string;
  plan_year: number;
  effective_date: string;
  termination_date: string | null;
  deductible_individual: number;
  deductible_family: number;
  oop_max_individual: number;
  oop_max_family: number;
  coinsurance_rate: number;
  copay_amount: number | null;
  copay_applies_to: string[] | null;
  cob_policy: COBPolicyType;
  covered_services: CoveredService[];
  created_at: string;
}
