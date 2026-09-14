// Row shapes for the edi_transactions / edi_errors tables (see
// supabase/migrations/20260914_edi_gateway.sql). Mirrors exactly what
// src/lib/edi-gateway.ts selects — kept separate from the Supabase
// generated Database type since that type doesn't cover these tables yet.

export type EdiTransactionStatus = "received" | "validated" | "rejected" | "normalized";
export type EdiValidationStatus = "valid" | "invalid";
export type EdiErrorSeverity = "error" | "warning";

export interface EdiTransactionRow {
  transaction_id: string;
  org_id: string | null;
  transaction_type: string;
  file_name: string;
  sender_id: string | null;
  receiver_id: string | null;
  interchange_control_number: string | null;
  functional_group_number: string | null;
  transaction_set_number: string | null;
  status: EdiTransactionStatus;
  validation_status: EdiValidationStatus;
  segment_count: number;
  error_count: number;
  received_at: string;
}

export interface EdiErrorRow {
  error_id: string;
  transaction_id: string;
  severity: EdiErrorSeverity;
  error_code: string | null;
  message: string;
  created_at: string;
}
