// Row shapes for the payer_contracts / fee_schedules tables (Phase 15).
// @/engine/contract-to-terms.ts converts these into the ContractTerms
// shape the adjudication engine (@/types/claim) actually consumes.

export interface PayerContract {
  contract_id: string;
  payer_name: string;
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
