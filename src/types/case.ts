// A Case groups one or more related claims (e.g. multiple lines of the
// same encounter, or a claim plus its appeals) under one work item that
// billing staff can track and annotate. Backed by the `cases` /
// `case_events` tables (see supabase/migrations/20260914_claims_core.sql).

export type CaseStatus = "open" | "in_progress" | "blocked" | "resolved" | "closed";

export interface Case {
  case_id: string;
  title: string;
  claim_ids: string[];
  status: CaseStatus;
  owner: string;
  opened_at: string;
  closed_at?: string;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface CaseEvent {
  event_id: string;
  case_id: string;
  occurred_at: string;
  actor: string;
  kind: "note" | "status_change" | "claim_linked" | "claim_unlinked" | "escalation";
  description: string;
}
