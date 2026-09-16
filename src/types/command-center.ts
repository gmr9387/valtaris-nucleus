// Response shape for the command-center-stats Edge Function
// (supabase/functions/command-center-stats/) -- see that function's
// header for why it's a dedicated endpoint rather than a direct
// supabase.from() query (api_clients/api_rate_limits/api_activity all
// have zero RLS policies, service-role only).

export interface CommandCenterClient {
  client_id: string;
  label: string | null;
  enabled: boolean;
  created_at: string;
  organization_id: string | null;
  organization_name: string | null;
  requests_last_hour: number;
  last_seen: string | null;
  outcomes_last_24h: Record<string, Record<string, number>>;
}

export interface CommandCenterActivityRow {
  client_id: string;
  endpoint: "adjudicate_claim" | "weaver_score" | "guardian_status";
  outcome: string;
  detail: Record<string, unknown>;
  occurred_at: string;
}

export interface CommandCenterStats {
  clients: CommandCenterClient[];
  recent_activity: CommandCenterActivityRow[];
}
