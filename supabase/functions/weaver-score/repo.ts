// Deno-native data access for this Edge Function -- same pattern as
// adjudicate-claim/repo.ts's header explains: same tables, same
// project, just a runtime-appropriate client construction.
import { createClient } from "npm:@supabase/supabase-js@2";
import type { WeaverRule, WeaverRuleStage } from "./types.ts";
import { hashApiKey, orgScopeFilter } from "./pure.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Mirrors src/lib/weaver-rules.ts's listWeaverRules(). organizationId
 * scopes the rule set to the caller's tenant, same convention as
 * adjudicate-claim/repo.ts's resolveContract/resolvePlan -- a rule
 * with organization_id set only fires for that tenant's own callers;
 * organization_id null is a shared/global default rule every tenant
 * gets. See supabase/migrations/20260916c_tenant_isolation.sql.
 */
export async function listWeaverRules(
  stage: WeaverRuleStage,
  organizationId: string | null,
): Promise<WeaverRule[]> {
  let query = supabase.from("weaver_rules").select("*").eq("stage", stage).eq("enabled", true);
  const scope = orgScopeFilter(organizationId);
  query = scope.kind === "or" ? query.or(scope.value) : query.is("organization_id", null);
  const { data, error } = await query;
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

export interface VerifiedClient {
  clientId: string;
  organizationId: string | null;
}

/**
 * Real API-key auth: identical to adjudicate-claim/repo.ts's
 * verifyApiKey -- same api_clients table gates every nucleus external
 * API, so one credential (e.g. DualPay's) authorizes both endpoints.
 * Also resolves the caller's tenant -- see that function's comment.
 */
export async function verifyApiKey(rawKey: string | null): Promise<VerifiedClient | null> {
  if (!rawKey) return null;

  const hashHex = await hashApiKey(rawKey);

  const { data, error } = await supabase
    .from("api_clients")
    .select("client_id, enabled, organization_id")
    .eq("key_hash", hashHex)
    .maybeSingle();
  if (error || !data || !data.enabled) return null;
  return {
    clientId: data.client_id as string,
    organizationId: data.organization_id as string | null,
  };
}
