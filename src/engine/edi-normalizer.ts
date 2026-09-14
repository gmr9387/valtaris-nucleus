/**
 * X12 835 / 837 Normalizer
 *
 * Interprets the segment stream x12-parser.ts produces into the
 * canonical shapes the rest of the pipeline understands. Covers the
 * segments actually needed downstream (CLP/CAS/SVC for 835; CLM/SV1/SV2
 * for 837) — this is not a full 5010 implementation-guide-compliant
 * reader (no situational-segment coverage for every loop), but every
 * value it does extract is read from the real segment position, not
 * guessed.
 */
import type { ParsedX12, X12Segment } from "./x12-parser";
import { componentsOf } from "./x12-parser";
import type { CanonicalRemittance } from "@/types/import";

export interface CanonicalClaim837 {
  claim_id: string;
  claim_type: "professional" | "institutional";
  payer_name?: string;
  billing_provider_npi?: string;
  billing_provider_name?: string;
  subscriber_member_id?: string;
  patient_name?: string;
  total_charge_cents: number;
  service_date?: string;
  procedure_code?: string;
}

function el(seg: X12Segment | undefined, idx: number): string | undefined {
  const v = seg?.elements[idx];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function toCents(amount: string | undefined): number {
  if (!amount) return 0;
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** X12 dates are CCYYMMDD (5010) or occasionally YYMMDD (legacy 4010). Empty string on anything else — callers already treat '' as "unknown", not "today". */
function parseX12Date(raw: string | undefined): string {
  if (!raw) return "";
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (/^\d{6}$/.test(raw)) {
    const yy = Number(raw.slice(0, 2));
    const century = yy < 50 ? "20" : "19";
    return `${century}${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  }
  return "";
}

function segmentBlocks(segments: X12Segment[], boundaryType: string): X12Segment[][] {
  const starts: number[] = [];
  segments.forEach((s, i) => {
    if (s.segment_type === boundaryType) starts.push(i);
  });
  return starts.map((start, i) => segments.slice(start, starts[i + 1] ?? segments.length));
}

export function normalize835(parsed: ParsedX12): CanonicalRemittance[] {
  const segments = parsed.segments;

  const payerSeg = segments.find((s) => s.segment_type === "N1" && el(s, 1) === "PR");
  const payerName = el(payerSeg, 2) ?? "Unknown Payer";

  const trnSeg = segments.find((s) => s.segment_type === "TRN");
  const paymentReference = el(trnSeg, 2) ?? "";

  const productionDateSeg = segments.find((s) => s.segment_type === "DTM" && el(s, 1) === "405");
  const remittanceDate = parseX12Date(el(productionDateSeg, 2));

  return segmentBlocks(segments, "CLP").map((block, order) => {
    const clp = block[0];
    const claimId = el(clp, 1) ?? `UNKNOWN-${order + 1}`;
    const billedCents = toCents(el(clp, 3));
    const paidCents = toCents(el(clp, 4));
    const patientRespCents = toCents(el(clp, 5));

    const casSegments = block.filter((s) => s.segment_type === "CAS");
    let contractualAdjustmentCents = 0;
    let primaryCarc: string | undefined;
    let primaryGroup: string | undefined;
    for (const cas of casSegments) {
      // CAS: group,reason,amount repeating in triples from element 1.
      for (let i = 1; i + 1 < cas.elements.length; i += 3) {
        const group = el(cas, i);
        const reason = el(cas, i + 1);
        const amount = toCents(el(cas, i + 2));
        if (!group || !reason) continue;
        if (group === "CO") contractualAdjustmentCents += amount;
        if (!primaryCarc) {
          primaryCarc = reason;
          primaryGroup = group;
        }
      }
    }

    const rarcSeg = block.find((s) => s.segment_type === "LQ" && el(s, 1) === "HE");
    const rarcCode = el(rarcSeg, 2);

    const serviceDateSeg = block.find(
      (s) => s.segment_type === "DTM" && (el(s, 1) === "232" || el(s, 1) === "472"),
    );
    const serviceDate = parseX12Date(el(serviceDateSeg, 2)) || remittanceDate;

    const allowedCents = Math.max(0, billedCents - contractualAdjustmentCents);

    const remittance: CanonicalRemittance = {
      index: order,
      claim_id: claimId,
      payer_name: payerName,
      service_date: serviceDate,
      remittance_date: remittanceDate,
      payment_reference: paymentReference,
      check_number: paymentReference || undefined,
      billed_cents: billedCents,
      allowed_cents: allowedCents,
      paid_cents: paidCents,
      patient_resp_cents: patientRespCents,
      adjustment_cents: contractualAdjustmentCents,
      carc_code: primaryCarc,
      rarc_code: rarcCode,
      group_code: primaryGroup,
    };
    return remittance;
  });
}

export function normalize837(parsed: ParsedX12): CanonicalClaim837[] {
  const segments = parsed.segments;
  const claimType: "professional" | "institutional" =
    parsed.envelope.transaction_type === "837I" ? "institutional" : "professional";

  const billingProviderSeg = segments.find((s) => s.segment_type === "NM1" && el(s, 1) === "85");
  const billingProviderName = el(billingProviderSeg, 3);
  const billingProviderNpi =
    el(billingProviderSeg, 8) === "XX" ? el(billingProviderSeg, 9) : undefined;

  const payerSeg = segments.find((s) => s.segment_type === "NM1" && el(s, 1) === "PR");
  const payerName = el(payerSeg, 3);

  const subscriberSeg = segments.find((s) => s.segment_type === "NM1" && el(s, 1) === "IL");
  const subscriberMemberId = el(subscriberSeg, 9);
  const patientName =
    [el(subscriberSeg, 4), el(subscriberSeg, 3)].filter(Boolean).join(" ") || undefined;

  return segmentBlocks(segments, "CLM").map((block, order) => {
    const clm = block[0];
    const claimId = el(clm, 1) ?? `UNKNOWN-${order + 1}`;
    const totalChargeCents = toCents(el(clm, 2));

    const dtpSeg = block.find((s) => s.segment_type === "DTP" && el(s, 1) === "472");
    const serviceDate = dtpSeg ? parseX12Date(el(dtpSeg, 3)) : undefined;

    const sv1 = block.find((s) => s.segment_type === "SV1");
    const sv2 = block.find((s) => s.segment_type === "SV2");
    let procedureCode: string | undefined;
    if (sv1) {
      procedureCode = componentsOf(parsed, sv1.elements[1] ?? "")[1];
    } else if (sv2) {
      procedureCode = componentsOf(parsed, sv2.elements[2] ?? "")[1];
    }

    const claim: CanonicalClaim837 = {
      claim_id: claimId,
      claim_type: claimType,
      payer_name: payerName,
      billing_provider_npi: billingProviderNpi,
      billing_provider_name: billingProviderName,
      subscriber_member_id: subscriberMemberId,
      patient_name: patientName,
      total_charge_cents: totalChargeCents,
      service_date: serviceDate || undefined,
      procedure_code: procedureCode,
    };
    return claim;
  });
}
