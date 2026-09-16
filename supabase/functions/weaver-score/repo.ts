// Deno-native data access for this Edge Function -- same pattern as
// adjudicate-claim/repo.ts's header explains: same tables, same
// project, just a runtime-appropriate client construction.
import { createClient } from "npm:@supabase/supabase-js@2";
import type { WeaverRule, WeaverRuleStage } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** Mirrors src/lib/weaver-rules.ts's listWeaverRules(). */
export async function listWeaverRules(stage: WeaverRuleStage): Promise<WeaverRule[]> {
  const { data, error } = await supabase
    .from("weaver_rules")
    .select("*")
    .eq("stage", stage)
    .eq("enabled", true);
  if (error) throw new Error(`Failed to list weaver_rules for stage ${stage}: ${error.message}`);
  return (data ?? []) as unknown as WeaverRule[];
}

/**
 * Fixed-window rate limit, keyed by client_id -- identical to
 * adjudicate-claim/repo.ts's checkRateLimit; see
 * supabase/migrations/20260916_api_rate_limits.sql. Fails open on an
 * infrastructure error, same rationale as that file's copy.
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
    console.error("[weaver-score] rate limit check failed, failing open:", error.message);
    return true;
  }
  return data as boolean;
}

/**
 * Durable, queryable record of this function's business-outcome
 * events -- identical to adjudicate-claim/repo.ts's recordActivity;
 * see supabase/migrations/20260916b_api_activity.sql for why.
 */
export async function recordActivity(
  clientId: string,
  outcome: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("api_activity")
    .insert({ client_id: clientId, endpoint: "weaver_score", outcome, detail });
  if (error) {
    console.error("[weaver-score] failed to record activity:", error.message);
  }
}

/**
 * Real API-key auth: identical to adjudicate-claim/repo.ts's
 * verifyApiKey -- same api_clients table gates every nucleus external
 * API, so one credential (e.g. DualPay's) authorizes both endpoints.
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
