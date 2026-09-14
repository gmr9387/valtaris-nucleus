// Import pipeline types — the common shape every ingestion source
// (raw 835 remittance, CSV underpayment report, aging report, appeal
// status export, manual upload) is normalized into before it reaches
// the Recovery Factory (@/engine/import-to-claim.ts).

export type ImportSourceType =
  "remittance_835" | "underpayment_report" | "aging_report" | "appeal_status" | "manual_upload";

/**
 * Canonical field names every import source maps its raw columns/segments
 * onto. Not every row populates every field — absence means "unknown",
 * not "zero" (rowToClaim treats missing amounts as 0 explicitly at the
 * point it needs a number).
 */
export type CanonicalField =
  | "claim_id"
  | "member_id"
  | "payer_name"
  | "provider_npi"
  | "provider_name"
  | "procedure_code"
  | "service_date"
  | "submitted_date"
  | "remittance_date"
  | "aging_days"
  | "billed_amount"
  | "allowed_amount"
  | "paid_amount"
  | "patient_responsibility"
  | "adjustment_amount"
  | "amount_at_risk"
  | "carc_code"
  | "rarc_code"
  | "group_code"
  | "denial_message"
  | "appeal_status"
  | "payment_reference"
  | "check_number";

export type CanonicalValue = string | number | undefined;

export interface RowIssue {
  field?: CanonicalField;
  severity: "error" | "warning";
  message: string;
}

export interface ParsedRow {
  index: number;
  /** Original, un-normalized row as it came from the source (raw CSV cells, raw 835 fields, etc). */
  raw: Record<string, unknown>;
  normalized: Partial<Record<CanonicalField, CanonicalValue>>;
  issues: RowIssue[];
  status: "ok" | "warning" | "error";
}

/**
 * A single payer remittance line, normalized out of an 835 transaction.
 * All dollar fields are in cents, matching ContractTerms.fee_schedule's
 * convention (@/types/claim) and ClaimLine.billed_amount.
 */
export interface CanonicalRemittance {
  index: number;
  claim_id: string;
  payer_name: string;
  service_date: string;
  remittance_date: string;
  payment_reference: string;
  check_number?: string;
  billed_cents: number;
  allowed_cents: number;
  paid_cents: number;
  patient_resp_cents: number;
  adjustment_cents: number;
  carc_code?: string;
  rarc_code?: string;
  group_code?: string;
  denial_reason?: string;
}
