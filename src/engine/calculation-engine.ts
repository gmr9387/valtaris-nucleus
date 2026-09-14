/**
 * Thin re-export of the real deterministic adjudication kernel, vendored
 * at src/nucleus/subsystems/guardian/adjudication/calculationEngine.ts.
 * No duplicate logic — ClaimsWorkbench reaches it through the same
 * @/engine/* namespace the rest of the claims pipeline uses.
 */
export * from "@/nucleus/subsystems/guardian/adjudication/calculationEngine";
