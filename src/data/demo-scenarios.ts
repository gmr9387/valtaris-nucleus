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

// No demo COB scenario yet — an empty array is a legitimate "not configured"
// state, not a bug (see demoPlan.covered_services, which is empty for the
// same reason). Add entries here once a demo secondary-payer scenario is
// designed, keyed to a real line_id from a seeded demo claim.
export const demoPriorOutcomes: PriorPayerOutcome[] = [];
