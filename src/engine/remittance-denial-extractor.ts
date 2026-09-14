/**
 * Decides how much of a remittance is actually "at risk" (worth working
 * as a denial/underpayment) versus a normal, correct outcome (patient
 * responsibility, or paid exactly what was allowed) — and if it is at
 * risk, builds the DenialEvent for it via the shared scoring engine.
 */
import type { GroupCode, DenialEvent } from "@/types/clarity";
import type { NormalizedRemittance } from "./remittance-normalizer";
import { scoreDenial } from "./denial-intelligence";

const PATIENT_RESPONSIBILITY_GROUPS: ReadonlySet<GroupCode> = new Set(["PR"]);

export interface RemittanceClassification {
  amount_at_risk_cents: number;
  reason: string;
  is_denial: boolean;
}

export function classifyRemittance(rem: NormalizedRemittance): RemittanceClassification {
  const isPatientGroup = rem.group_code ? PATIENT_RESPONSIBILITY_GROUPS.has(rem.group_code) : false;

  if (rem.paid_cents === 0) {
    if (rem.group_code && !isPatientGroup) {
      const atRisk = Math.max(
        rem.allowed_cents - rem.patient_resp_cents,
        rem.billed_cents - rem.adjustment_cents,
        0,
      );
      return {
        amount_at_risk_cents: atRisk,
        reason: `Zero payment with ${rem.group_code}-${rem.carc_code ?? "unknown"} adjustment.`,
        is_denial: true,
      };
    }
    return {
      amount_at_risk_cents: 0,
      reason: "Zero payment attributed to patient responsibility, not a payer denial.",
      is_denial: false,
    };
  }

  const expectedAllowed = rem.allowed_cents || rem.billed_cents;
  const shortfall = expectedAllowed - rem.paid_cents - rem.patient_resp_cents;

  if (shortfall > 0) {
    const isDenial = Boolean(rem.carc_code) && !isPatientGroup;
    return {
      amount_at_risk_cents: shortfall,
      reason: `Paid ${rem.paid_cents} + patient responsibility ${rem.patient_resp_cents} is short of allowed ${expectedAllowed} by ${shortfall}.`,
      is_denial: isDenial,
    };
  }

  return {
    amount_at_risk_cents: 0,
    reason: "Paid in full per allowed amount; no shortfall detected.",
    is_denial: false,
  };
}

export function extractDenialEvent(
  rem: NormalizedRemittance,
  classification: RemittanceClassification,
  claimId: string,
  agingDays: number,
): Omit<DenialEvent, "line_id"> | undefined {
  if (!classification.is_denial || classification.amount_at_risk_cents <= 0 || !rem.carc_code) {
    return undefined;
  }

  return scoreDenial({
    denial_id: `DNL-${claimId}-835`,
    claim_id: claimId,
    line_id: "",
    occurred_at: new Date(Date.now() - agingDays * 86_400_000).toISOString(),
    carc: rem.carc_code,
    rarc: rem.rarc_code,
    group_code: rem.group_code ?? "CO",
    amount_cents: classification.amount_at_risk_cents,
    payer_message: rem.denial_message,
    aging_days: agingDays,
  });
}
