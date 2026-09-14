/**
 * Contract → ContractTerms Adapter
 *
 * The gap this closes: ClaimsWorkbench.tsx adjudicates real production
 * claims against `LIVE_CONTRACT` (src/lib/live-stubs.ts) -- a completely
 * empty ContractTerms object (empty fee schedule Map, blank ids) --
 * whenever demo mode is off. Meanwhile a real, versioned contract
 * upload feature already exists (src/lib/contracts.ts, Phase 15:
 * payer_contracts + fee_schedules tables) and has never been connected
 * to the calculation engine. This adapter is that connection.
 */
import { getContract, listFeeSchedules, listContracts } from "@/lib/contracts";
import type { ContractTerms } from "@/types/claim";

/**
 * Finds the active contract for a payer (optionally scoped to a specific
 * provider) as of a given date. A provider-specific contract (a row
 * whose provider_npi matches) is preferred over a payer-only contract
 * (provider_npi null) covering the same payer/date -- a payer can
 * contract differently with different providers, and a match to the
 * providerNpi actually billing this claim is more specific than a
 * blanket payer-level rate. Within either tier, the most recent version
 * whose effective/termination window covers asOfDate wins. Returns null
 * if no matching real contract has been uploaded yet -- callers must
 * decide what that means, same as fetchContractTerms below.
 */
export async function findActiveContractIdForPayer(
  payerName: string,
  asOfDate: string,
  providerNpi?: string,
): Promise<string | null> {
  const all = await listContracts();
  const matches = all.filter((c) => {
    if (c.payer_name.trim().toLowerCase() !== payerName.trim().toLowerCase()) return false;
    if (c.effective_date > asOfDate) return false;
    if (c.termination_date && c.termination_date < asOfDate) return false;
    return true;
  });
  if (matches.length === 0) return null;

  // Already ordered payer_name asc, effective_date desc by listContracts();
  // the first match within a tier is the most recent applicable version.
  if (!providerNpi) {
    // No provider given (existing callers) -- same behavior as before
    // provider-level contracts existed: any matching row.
    return matches[0].contract_id;
  }

  const providerMatch = matches.find((c) => c.provider_npi === providerNpi);
  if (providerMatch) return providerMatch.contract_id;

  const payerLevelMatch = matches.find((c) => !c.provider_npi);
  if (payerLevelMatch) return payerLevelMatch.contract_id;

  // Matches exist, but only for other providers -- applying someone
  // else's provider-specific rate would be actively wrong, not a
  // reasonable fallback. Correctly report "no applicable contract".
  return null;
}

/**
 * Fetches a real uploaded contract + its fee schedule and converts it
 * into the ContractTerms shape adjudicateClaim() expects.
 *
 * Returns null if the contract doesn't exist -- callers must decide
 * what that means (e.g. fall back to LIVE_CONTRACT with a visible
 * warning, or refuse to adjudicate). This function does not silently
 * substitute a default.
 */
export async function fetchContractTerms(contract_id: string): Promise<ContractTerms | null> {
  const contract = await getContract(contract_id);
  if (!contract) return null;

  const feeRows = await listFeeSchedules(contract_id);

  const fee_schedule = new Map<string, number>();
  for (const row of feeRows) {
    // Real fee schedule rows already store the amount in cents
    // (contracted_amount_cents), matching ContractTerms.fee_schedule's
    // convention (calculateAllowed compares directly against
    // line.billed_amount, which is also in cents -- no conversion here).
    fee_schedule.set(row.procedure_code, row.contracted_amount_cents);
  }

  return {
    contract_id: contract.contract_id,
    contract_version: contract.version,
    // FIXED: payer_contracts previously had no provider_npi column at
    // all, so this was always hardcoded empty. A payer-level contract
    // (provider_npi null on the row) legitimately has no single
    // provider to report here; a provider-specific contract reports its
    // real NPI.
    provider_npi: contract.provider_npi ?? "",
    effective_date: contract.effective_date,
    term_date: contract.termination_date ?? "",
    fee_schedule_id: `FS-${contract.contract_id}`,
    fee_schedule,
    // A contract with zero uploaded fee schedule rows falls back to
    // percent_of_billed at 100% (i.e. allowed = billed) rather than
    // fee_schedule with an empty map, which would deny every line via
    // calculateAllowed's "no match found" path. This is a real decision
    // worth confirming with the business: is "no fee schedule uploaded
    // yet" supposed to mean "pay full billed" or "deny everything until
    // configured"? Defaulting to the less destructive option for now.
    reimbursement_method: fee_schedule.size > 0 ? "fee_schedule" : "percent_of_billed",
    percent_of_billed: fee_schedule.size > 0 ? undefined : 1,
  };
}
