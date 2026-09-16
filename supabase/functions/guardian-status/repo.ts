// Deno-native data access for this Edge Function -- same pattern as
// adjudicate-claim/repo.ts and weaver-score/repo.ts's headers explain:
// same tables, same project, just a runtime-appropriate client
// construction.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export interface KillSwitchState {
  active: boolean;
  reason: string | null;
  activated_by: string | null;
  updated_at: string;
}

/** Mirrors src/lib/guardian-kill-switch.ts's fetchKillSwitch(). */
export async function fetchKillSwitch(): Promise<KillSwitchState> {
  const { data, error } = await supabase
    .from("guardian_kill_switch")
    .select("active, reason, activated_by, updated_at")
    .eq("id", "global")
    .single();
  if (error) throw new Error(`Failed to fetch kill switch: ${error.message}`);
  return data as unknown as KillSwitchState;
}

/**
 * Fixed-window rate limit, keyed by client_id -- identical to
 * adjudicate-claim/repo.ts's checkRateLimit; see
 * supabase/migrations/20260916_api_rate_limits.sql. This endpoint's
 * own README documents it as meant to be polled cheaply and often, so
 * its limit (set in index.ts) is deliberately far more generous than
 * adjudicate-claim/weaver-score's -- this still catches a genuine
 * runaway loop without punishing the polling pattern it's designed for.
 */
export async function checkRateLimit(
  clientId: string,
  windowSeconds: number,
  maxRequests: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_client_id: clientId,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });
  if (error) {
    console.error("[guardian-status] rate limit check failed, failing open:", error.message);
    return true;
  }
  return data as boolean;
}

/**
 * Durable, queryable record of this function's business-outcome
 * events -- identical to adjudicate-claim/repo.ts's recordActivity;
 * see supabase/migrations/20260916b_api_activity.sql for why. Called
 * from index.ts only on an unsafe/unverifiable result, matching that
 * file's console.log convention -- not on every routine poll.
 */
export async function recordActivity(
  clientId: string,
  outcome: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("api_activity")
    .insert({ client_id: clientId, endpoint: "guardian_status", outcome, detail });
  if (error) {
    console.error("[guardian-status] failed to record activity:", error.message);
  }
}

/**
 * Real API-key auth: identical to adjudicate-claim/repo.ts's and
 * weaver-score/repo.ts's verifyApiKey -- same api_clients table gates
 * every nucleus external API.
 */
export async function verifyApiKey(rawKey: string | null): Promise<string | null> {
  if (!rawKey) return null;

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  const hashHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await supabase
    .from("api_clients")
    .select("client_id, enabled")
    .eq("key_hash", hashHex)
    .maybeSingle();
  if (error || !data || !data.enabled) return null;
  return data.client_id as string;
}
