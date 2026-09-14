// Row shapes for the payer_contracts / fee_schedules tables (Phase 15).
// @/engine/contract-to-terms.ts converts these into the ContractTerms
// shape the adjudication engine (@/types/claim) actually consumes.

export interface PayerContract {
  contract_id: string;
  payer_name: string;
  /** null = applies to any provider billing this payer. A row with a
   *  real NPI is a provider-specific contract and is preferred over a
   *  payer-only match for the same payer/date. */
  provider_npi: string | null;
  version: string;
  effective_date: string;
  termination_date: string | null;
  reimbursement_method: "fee_schedule" | "percent_of_billed";
  percent_of_billed?: number;
  created_at: string;
}

export interface FeeScheduleRow {
  contract_id: string;
  procedure_code: string;
  contracted_amount_cents: number;
}
