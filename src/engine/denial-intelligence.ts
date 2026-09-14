/**
 * Denial Intelligence — deterministic scoring for a single denial event.
 *
 * The CARC knowledge base below covers the CARC codes that show up most
 * often in real-world commercial/Medicare/Medicaid remittances. Baseline
 * recoverability, required evidence, and default workflow owner per code
 * reflect standard revenue-cycle practice (e.g. CO-29 timely-filing
 * denials are rarely overturned; CO-16/CO-227 missing-information denials
 * usually are, once the missing piece is supplied). Codes not in the
 * table fall back to a conservative default rather than guessing.
 */
import type {
  DenialEvent,
  GroupCode,
  Severity,
  AgingBucket,
  Queue,
  WorkflowOwner,
  ReimbursementState,
} from "@/types/clarity";

export interface ScoreDenialInput {
  denial_id: string;
  claim_id: string;
  line_id: string;
  occurred_at: string;
  carc: string;
  rarc?: string;
  group_code: GroupCode;
  amount_cents: number;
  payer_message?: string;
  aging_days: number;
  prior_appeals_denied?: number;
}

interface CarcProfile {
  description: string;
  baseRecoverability: number; // 0-100
  evidenceRequired: string[];
  workflowOwner: WorkflowOwner;
}

const CARC_KB: Record<string, CarcProfile> = {
  "16": {
    description: "Claim/service lacks information or has a submission/billing error.",
    baseRecoverability: 70,
    evidenceRequired: ["Corrected claim form", "Missing information cited in payer remittance"],
    workflowOwner: "biller",
  },
  "18": {
    description: "Exact duplicate claim/service.",
    baseRecoverability: 20,
    evidenceRequired: ["Proof of distinct service (differing date, modifier, or provider)"],
    workflowOwner: "biller",
  },
  "22": {
    description: "This care may be covered by another payer per coordination of benefits.",
    baseRecoverability: 55,
    evidenceRequired: ["Other insurance EOB", "Completed COB questionnaire"],
    workflowOwner: "biller",
  },
  "29": {
    description: "The time limit for filing has expired.",
    baseRecoverability: 15,
    evidenceRequired: ["Proof of timely filing (original submission date/confirmation)"],
    workflowOwner: "appeals_specialist",
  },
  "45": {
    description: "Charge exceeds fee schedule/maximum allowable amount.",
    baseRecoverability: 25,
    evidenceRequired: ["Signed payer contract / fee schedule"],
    workflowOwner: "biller",
  },
  "50": {
    description: "These are non-covered services because this is not deemed a medical necessity.",
    baseRecoverability: 40,
    evidenceRequired: ["Medical necessity documentation", "Relevant clinical notes"],
    workflowOwner: "appeals_specialist",
  },
  "96": {
    description: "Non-covered charge(s).",
    baseRecoverability: 35,
    evidenceRequired: ["Plan benefit summary", "Medical necessity documentation"],
    workflowOwner: "appeals_specialist",
  },
  "97": {
    description:
      "The benefit for this service is included in the payment/allowance for another service (bundling).",
    baseRecoverability: 35,
    evidenceRequired: [
      "Procedure notes supporting a separate, distinct service",
      "NCCI modifier justification",
    ],
    workflowOwner: "coder",
  },
  "109": {
    description: "Claim/service not covered by this payer/contractor.",
    baseRecoverability: 65,
    evidenceRequired: ["Correct payer/plan verification"],
    workflowOwner: "biller",
  },
  "119": {
    description: "Benefit maximum for this time period or occurrence has been reached.",
    baseRecoverability: 15,
    evidenceRequired: ["Benefit utilization history"],
    workflowOwner: "biller",
  },
  "150": {
    description: "Payer deems the information submitted does not support this level of service.",
    baseRecoverability: 55,
    evidenceRequired: [
      "Clinical documentation supporting level of service",
      "Relevant medical records",
    ],
    workflowOwner: "appeals_specialist",
  },
  "151": {
    description:
      "Payer deems the information submitted does not support this many/frequency of services.",
    baseRecoverability: 50,
    evidenceRequired: ["Clinical documentation supporting frequency of services"],
    workflowOwner: "appeals_specialist",
  },
  "197": {
    description: "Precertification/authorization/notification absent.",
    baseRecoverability: 45,
    evidenceRequired: [
      "Retroactive authorization request",
      "Proof of medical urgency, if applicable",
    ],
    workflowOwner: "appeals_specialist",
  },
  "204": {
    description:
      "This service/equipment/drug is not covered under the patient's current benefit plan.",
    baseRecoverability: 20,
    evidenceRequired: ["Plan benefit summary", "Patient eligibility verification"],
    workflowOwner: "biller",
  },
  "227": {
    description:
      "Information requested from the billing/rendering provider was not provided or was insufficient.",
    baseRecoverability: 75,
    evidenceRequired: ["Requested documentation (see payer letter for specifics)"],
    workflowOwner: "biller",
  },
};

const DEFAULT_PAYER_PROFILE: CarcProfile = {
  description: "Adjustment reason not in the known baseline — review payer remittance for detail.",
  baseRecoverability: 40,
  evidenceRequired: ["Payer remittance detail", "Relevant medical records"],
  workflowOwner: "biller",
};

const DEFAULT_PATIENT_RESP_PROFILE: CarcProfile = {
  description:
    "Patient responsibility (deductible/coinsurance/copay) — not a payer denial to appeal.",
  baseRecoverability: 5,
  evidenceRequired: [],
  workflowOwner: "biller",
};

function agingPenalty(agingDays: number): number {
  if (agingDays > 180) return 25;
  if (agingDays > 90) return 15;
  if (agingDays > 45) return 5;
  return 0;
}

function priorAppealPenalty(priorDenied: number): number {
  return Math.min(40, priorDenied * 20);
}

export function scoreDenial(input: ScoreDenialInput): DenialEvent {
  const profile =
    CARC_KB[input.carc] ??
    (input.group_code === "PR" ? DEFAULT_PATIENT_RESP_PROFILE : DEFAULT_PAYER_PROFILE);

  const recoverability_score = Math.max(
    0,
    Math.min(
      100,
      profile.baseRecoverability -
        agingPenalty(input.aging_days) -
        priorAppealPenalty(input.prior_appeals_denied ?? 0),
    ),
  );

  return {
    denial_id: input.denial_id,
    claim_id: input.claim_id,
    line_id: input.line_id,
    occurred_at: input.occurred_at,
    carc_code: input.carc,
    rarc_code: input.rarc,
    group_code: input.group_code,
    amount_cents: input.amount_cents,
    payer_message: input.payer_message ?? profile.description,
    aging_days: input.aging_days,
    prior_appeals_denied: input.prior_appeals_denied ?? 0,
    recoverability_score,
    workflow_owner: profile.workflowOwner,
    evidence_required: profile.evidenceRequired,
  };
}

export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

export function computeSeverity(amountAtRiskCents: number, recoverabilityScore: number): Severity {
  const dollarsAtRisk = amountAtRiskCents / 100;
  if (dollarsAtRisk >= 5000 && recoverabilityScore < 50) return "critical";
  if (dollarsAtRisk >= 5000 || recoverabilityScore < 30) return "high";
  if (dollarsAtRisk >= 500 || recoverabilityScore < 60) return "medium";
  return "low";
}

const SLA_DAYS_BY_SEVERITY: Record<Severity, number> = {
  critical: 3,
  high: 7,
  medium: 14,
  low: 30,
};

export function computeSlaDueAt(submittedAt: string, severity: Severity): string {
  const base = new Date(submittedAt).getTime();
  const days = SLA_DAYS_BY_SEVERITY[severity];
  return new Date(base + days * 86_400_000).toISOString();
}

export interface DeriveQueuesInput {
  reimbursement_state: ReimbursementState;
  amount_at_risk_cents: number;
  evidence_missing: string[];
  appeals: unknown[];
  aging_days: number;
  is_escalated: boolean;
  is_stalled: boolean;
  denial_events: DenialEvent[];
}

export function deriveQueues(input: DeriveQueuesInput): Queue[] {
  const queues: Queue[] = [];
  if (input.evidence_missing.length > 0) {
    queues.push("missing_docs");
  } else if (input.denial_events.length > 0 && input.reimbursement_state !== "paid") {
    queues.push("ready_to_appeal");
  }
  if (input.reimbursement_state === "pending_payer") queues.push("pending_payer");
  if (input.is_escalated) queues.push("escalated");
  if (input.is_stalled) queues.push("stalled");
  if (input.amount_at_risk_cents >= 250_000) queues.push("high_value_review");
  return queues;
}
