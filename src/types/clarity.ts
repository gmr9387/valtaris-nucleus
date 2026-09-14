// Claim Clarity — operational intelligence types layered on top of the
// core adjudication domain (@/types/claim). Where @/types/claim describes
// what a claim *is* and how it was adjudicated, ClaimIntel describes the
// revenue-cycle state derived from that: is it stuck, who owns it, what's
// missing, and how much money is actually recoverable.

export type PayerClass = "commercial" | "medicare" | "medicaid";

export type ReimbursementState =
  "denied" | "partially_paid" | "paid" | "appealing" | "pending_payer";

export type AgingBucket = "0-30" | "31-60" | "61-90" | "91-120" | "120+";

export type Severity = "low" | "medium" | "high" | "critical";

export type WorkflowOwner = "biller" | "coder" | "appeals_specialist" | "manager" | "legal";

// Standard ANSI X12 835 claim-adjustment group codes.
export type GroupCode = "CO" | "PR" | "OA" | "PI" | "CR";

export type Queue =
  | "ready_to_appeal"
  | "missing_docs"
  | "pending_payer"
  | "escalated"
  | "high_value_review"
  | "stalled";

export interface DenialEvent {
  denial_id: string;
  claim_id: string;
  line_id: string;
  occurred_at: string; // ISO timestamp
  carc_code: string;
  rarc_code?: string;
  group_code: GroupCode;
  amount_cents: number;
  payer_message?: string;
  aging_days: number;
  prior_appeals_denied: number;
  /** 0-100. How likely this denial is to be successfully overturned/recovered. */
  recoverability_score: number;
  workflow_owner: WorkflowOwner;
  /** Evidence items this denial reason requires for a successful appeal. */
  evidence_required: string[];
}

export interface Appeal {
  appeal_id: string;
  claim_id: string;
  denial_id?: string;
  submitted_at: string;
  status: "draft" | "submitted" | "under_review" | "won" | "lost";
  evidence_attached: string[];
  notes?: string;
}

export interface PayerResponse {
  response_id: string;
  claim_id: string;
  occurred_at: string;
  kind: "remittance" | "correspondence" | "portal_status";
  summary: string;
}

export interface TimelineEvent {
  event_id: string;
  claim_id: string;
  occurred_at: string;
  kind: string;
  actor: string;
  description: string;
  amount_cents?: number;
}

export interface ClaimIntel {
  payer_id: string;
  payer_name: string;
  payer_class: PayerClass;
  submitted_at: string;
  aging_days: number;
  aging_bucket: AgingBucket;
  reimbursement_state: ReimbursementState;
  expected_reimbursement_cents: number;
  actual_reimbursement_cents: number;
  underpayment_cents: number;
  amount_at_risk_cents: number;
  /** 0-100. Blended recoverability across all denial events on this claim. */
  recoverability_score: number;
  severity: Severity;
  workflow_owner: WorkflowOwner;
  sla_due_at: string;
  is_escalated: boolean;
  is_stalled: boolean;
  is_high_value: boolean;
  denial_events: DenialEvent[];
  payer_responses: PayerResponse[];
  timeline: TimelineEvent[];
  appeals: Appeal[];
  /** Evidence items not yet confirmed present for this claim's active denial. */
  evidence_missing: string[];
  notes: string[];
  queues: Queue[];
}
