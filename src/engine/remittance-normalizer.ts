/**
 * Flattens a ParsedRow (whatever shape the source import took) into a
 * plain remittance record, so remittance-denial-extractor.ts doesn't
 * need to know about CanonicalField/ParsedRow at all.
 */
import type { ParsedRow, CanonicalField } from "@/types/import";
import type { GroupCode } from "@/types/clarity";

export interface NormalizedRemittance {
  claim_id: string;
  billed_cents: number;
  paid_cents: number;
  allowed_cents: number;
  patient_resp_cents: number;
  adjustment_cents: number;
  carc_code?: string;
  rarc_code?: string;
  group_code?: GroupCode;
  denial_message?: string;
}

function numField(row: ParsedRow, key: CanonicalField): number {
  const v = row.normalized[key];
  return typeof v === "number" ? v : 0;
}

function strField(row: ParsedRow, key: CanonicalField): string | undefined {
  const v = row.normalized[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

export function normalizeRemittance(row: ParsedRow): NormalizedRemittance {
  const billed_cents = numField(row, "billed_amount");
  const allowedRaw = numField(row, "allowed_amount");
  return {
    claim_id: strField(row, "claim_id") ?? "",
    billed_cents,
    paid_cents: numField(row, "paid_amount"),
    allowed_cents: allowedRaw > 0 ? allowedRaw : billed_cents,
    patient_resp_cents: numField(row, "patient_responsibility"),
    adjustment_cents: numField(row, "adjustment_amount"),
    carc_code: strField(row, "carc_code"),
    rarc_code: strField(row, "rarc_code"),
    group_code: strField(row, "group_code") as GroupCode | undefined,
    denial_message: strField(row, "denial_message"),
  };
}
