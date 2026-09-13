/**
 * EDI → Claim Adapter
 *
 * The gap this closes: ingestEdiFile() (src/lib/edi-gateway.ts) correctly
 * parses and normalizes real 835 remittance files into CanonicalRemittance
 * objects, but its own comment states that "auto-creating
 * remittance_batches/claims rows is deferred to existing engines" --
 * that promotion step never got written. rowToClaim() (import-to-claim.ts)
 * already does exactly that promotion correctly (real denial scoring,
 * real recoverability scoring, builds a full ClaimIntel) -- it just
 * expects a ParsedRow, not a CanonicalRemittance.
 *
 * This adapter is a pure mapping between the two shapes. No new scoring
 * or business logic -- every dollar amount here is already in cents,
 * matching CanonicalRemittance's convention, and ParsedRow.normalized
 * expects the same units (confirmed by tracing how import-to-claim.ts
 * itself reads these fields -- it never divides by 100).
 */
import type { ParsedRow } from "@/types/import";
import type { CanonicalRemittance } from "@/types/import";

export function remittanceToParsedRow(rem: CanonicalRemittance, index: number): ParsedRow {
  return {
    index,
    raw: {
      claim_id: rem.claim_id,
      payer_name: rem.payer_name,
    },
    normalized: {
      claim_id: rem.claim_id,
      payer_name: rem.payer_name,
      service_date: rem.service_date,
      remittance_date: rem.remittance_date,
      payment_reference: rem.payment_reference,
      check_number: rem.check_number,
      billed_amount: rem.billed_cents,
      allowed_amount: rem.allowed_cents,
      paid_amount: rem.paid_cents,
      patient_responsibility: rem.patient_resp_cents,
      adjustment_amount: rem.adjustment_cents,
      carc_code: rem.carc_code,
      rarc_code: rem.rarc_code,
      group_code: rem.group_code,
      denial_message: rem.denial_reason,
    },
    issues: [],
    status: "ok",
  };
}

export function remittancesToParsedRows(remittances: CanonicalRemittance[]): ParsedRow[] {
  return remittances.map((rem, i) => remittanceToParsedRow(rem, i));
}
