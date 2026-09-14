/**
 * Payer documentation expectations — a baseline per payer class, unioned
 * with whatever evidence this specific payer's own denials have actually
 * required across claims we've already seen (a real signal, not a guess).
 */
import type { ClaimIntel, PayerClass } from "@/types/clarity";

export interface PayerRequirements {
  payer_id: string;
  payer_name: string;
  documentation_expectations: string[];
}

const PAYER_CLASS_DOCUMENTATION_BASELINE: Record<PayerClass, string[]> = {
  medicare: [
    "Advance Beneficiary Notice (ABN), if applicable",
    "Medical necessity documentation per LCD/NCD",
  ],
  medicaid: ["Prior authorization confirmation", "Eligibility verification snapshot"],
  commercial: ["Prior authorization confirmation", "Itemized statement"],
};

export function findRequirementsFor(
  payerId: string,
  allClaims: Array<{ intel: ClaimIntel }>,
): PayerRequirements | undefined {
  const match = allClaims.find((c) => c.intel.payer_id === payerId);
  if (!match) return undefined;

  const baseline = PAYER_CLASS_DOCUMENTATION_BASELINE[match.intel.payer_class] ?? [];

  const historical = new Set<string>();
  for (const c of allClaims) {
    if (c.intel.payer_id !== payerId) continue;
    for (const denial of c.intel.denial_events) {
      denial.evidence_required.forEach((item) => historical.add(item));
    }
  }

  return {
    payer_id: payerId,
    payer_name: match.intel.payer_name,
    documentation_expectations: Array.from(new Set([...baseline, ...historical])),
  };
}
