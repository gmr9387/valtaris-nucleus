/**
 * Demo contract/plan/prior-outcomes for demo mode. The contract and plan
 * are the exact same values already vendored into
 * src/nucleus/subsystems/guardian/adjudication/demoContractPlan.ts (that
 * file's own header says it was copied verbatim from here) — re-exported
 * rather than duplicated so there is exactly one source of truth.
 */
export {
  demoContract,
  demoPlan,
} from "@/nucleus/subsystems/guardian/adjudication/demoContractPlan";

import type { PriorPayerOutcome } from "@/types/claim";

// Demo COB scenario: CLM-DEMO-1002 (seeded in @/data/repository.ts) is
// given an OHI indicator declaring UnitedHealthcare primary
// (primacy_order 1), so this plan adjudicates it as secondary. This is
// the matching primary-payer outcome for that claim's one line --
// without it, ClaimsWorkbench would correctly leave the claim pended
// ("awaiting primary EOB") rather than guess. Keyed to the real line_id
// rowToClaim() assigns (`L1-${claim_id}`), not a placeholder.
export const demoPriorOutcomes: PriorPayerOutcome[] = [
  {
    payer_id: "UHC-PRIMARY",
    payer_name: "UnitedHealthcare",
    claim_line_id: "L1-CLM-DEMO-1002",
    billed: 12_000,
    allowed: 9_600,
    paid: 6_000,
    patient_responsibility: 0,
    adjustments: [{ carc_code: "45", amount: 2_400, group_code: "CO" }],
    source: "edi_835",
    confidence: 0.95,
  },
];
