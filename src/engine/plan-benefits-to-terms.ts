/**
 * Plan Benefits -> PlanBenefits Adapter
 *
 * Mirrors @/engine/contract-to-terms.ts exactly, for the same reason:
 * ClaimsWorkbench.tsx adjudicates real production claims against
 * LIVE_PLAN (src/lib/live-stubs.ts) -- a completely empty PlanBenefits
 * object -- whenever demo mode is off, because until now there was no
 * real, versioned plan-benefits store to look up instead. This adapter
 * is that connection, for plan benefits the same way contract-to-terms.ts
 * already is for fee schedules.
 */
import { getPlanBenefits, listPlanBenefits } from "@/lib/plan-benefits";
import type { PlanBenefits } from "@/types/claim";

/**
 * Finds the active plan for a payer as of a given date (most recent
 * version whose effective/termination window covers asOfDate). Returns
 * null if no matching real plan has been uploaded yet -- callers must
 * decide what that means, same as fetchPlanBenefitTerms below.
 */
export async function findActivePlanIdForPayer(
  payerName: string,
  asOfDate: string,
): Promise<string | null> {
  const all = await listPlanBenefits();
  const matches = all.filter((p) => {
    if (p.payer_name.trim().toLowerCase() !== payerName.trim().toLowerCase()) return false;
    if (p.effective_date > asOfDate) return false;
    if (p.termination_date && p.termination_date < asOfDate) return false;
    return true;
  });
  if (matches.length === 0) return null;

  // Already ordered payer_name asc, effective_date desc by listPlanBenefits();
  // the first match is the most recent applicable version.
  return matches[0].plan_id;
}

/**
 * Fetches a real uploaded plan and converts it into the PlanBenefits
 * shape adjudicateClaim() expects.
 *
 * Returns null if the plan doesn't exist -- callers must decide what
 * that means (e.g. fall back to LIVE_PLAN with a visible warning, or
 * refuse to adjudicate). This function does not silently substitute a
 * default.
 */
export async function fetchPlanBenefitTerms(plan_id: string): Promise<PlanBenefits | null> {
  const row = await getPlanBenefits(plan_id);
  if (!row) return null;

  return {
    plan_id: row.plan_id,
    plan_version: row.version,
    plan_name: row.plan_name,
    plan_year: row.plan_year,
    deductible_individual: row.deductible_individual,
    deductible_family: row.deductible_family,
    oop_max_individual: row.oop_max_individual,
    oop_max_family: row.oop_max_family,
    coinsurance_rate: row.coinsurance_rate,
    copay_amount: row.copay_amount ?? undefined,
    copay_applies_to: row.copay_applies_to ?? undefined,
    cob_policy: row.cob_policy,
    covered_services: row.covered_services ?? [],
  };
}
