/**
 * Deno-native data access for this Edge Function -- deliberately
 * separate from valtaris-nucleus's own src/integrations/supabase/client.ts
 * (a Vite-build-time client reading import.meta.env/process.env, neither
 * of which exist in the Edge Function runtime) and from src/lib/contracts.ts
 * etc. (which import that client). Same tables, same columns, same
 * project -- just a runtime-appropriate client construction using
 * Deno.env.get(), and the service-role key Supabase auto-injects into
 * every Edge Function (no custom secret needed for DB access).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import type { ContractTerms, PlanBenefits, MemberAccumulators } from "./types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Resolves the active contract for a payer (optionally scoped to a
 * provider) as of a date -- mirrors src/engine/contract-to-terms.ts's
 * findActiveContractIdForPayer()+fetchContractTerms() logic exactly,
 * merged into one round trip. Returns null if no real contract has been
 * uploaded for this payer/date -- this endpoint does not fall back to
 * demo data (see index.ts's header comment for why).
 */
export async function resolveContract(
  payerName: string,
  asOfDate: string,
  providerNpi?: string,
): Promise<ContractTerms | null> {
  const { data: contracts, error } = await supabase
    .from("payer_contracts")
    .select("*")
    .ilike("payer_name", payerName.trim())
    .order("effective_date", { ascending: false });

  if (error) throw new Error(`Failed to list payer_contracts: ${error.message}`);

  const matches = (contracts ?? []).filter(
    (c: Record<string, unknown>) =>
      (c.effective_date as string) <= asOfDate &&
      (!c.termination_date || (c.termination_date as string) >= asOfDate),
  );
  if (matches.length === 0) return null;

  let chosen: Record<string, unknown> | undefined;
  if (providerNpi) {
    chosen = matches.find((c: Record<string, unknown>) => c.provider_npi === providerNpi);
    if (!chosen) chosen = matches.find((c: Record<string, unknown>) => !c.provider_npi);
    if (!chosen) return null; // matches exist, but only for other providers
  } else {
    chosen = matches[0];
  }
  if (!chosen) return null;

  const { data: feeRows, error: feeError } = await supabase
    .from("fee_schedules")
    .select("procedure_code, contracted_amount_cents")
    .eq("contract_id", chosen.contract_id as string);
  if (feeError) throw new Error(`Failed to list fee_schedules: ${feeError.message}`);

  const fee_schedule = new Map<string, number>();
  for (const row of feeRows ?? []) {
    fee_schedule.set(row.procedure_code as string, row.contracted_amount_cents as number);
  }

  return {
    contract_id: chosen.contract_id as string,
    contract_version: chosen.version as string,
    provider_npi: (chosen.provider_npi as string | null) ?? "",
    effective_date: chosen.effective_date as string,
    term_date: (chosen.termination_date as string | null) ?? "",
    fee_schedule_id: `FS-${chosen.contract_id as string}`,
    fee_schedule,
    reimbursement_method: fee_schedule.size > 0 ? "fee_schedule" : "percent_of_billed",
    percent_of_billed: fee_schedule.size > 0 ? undefined : 1,
  };
}

/**
 * Resolves the active plan for a payer as of a date -- mirrors
 * src/engine/plan-benefits-to-terms.ts's findActivePlanIdForPayer()+
 * fetchPlanBenefitTerms() logic, merged into one round trip.
 */
export async function resolvePlan(
  payerName: string,
  asOfDate: string,
): Promise<PlanBenefits | null> {
  const { data: plans, error } = await supabase
    .from("plan_benefits")
    .select("*")
    .ilike("payer_name", payerName.trim())
    .order("effective_date", { ascending: false });
  if (error) throw new Error(`Failed to list plan_benefits: ${error.message}`);

  const matches = (plans ?? []).filter(
    (p: Record<string, unknown>) =>
      (p.effective_date as string) <= asOfDate &&
      (!p.termination_date || (p.termination_date as string) >= asOfDate),
  );
  if (matches.length === 0) return null;

  const row = matches[0];
  return {
    plan_id: row.plan_id as string,
    plan_version: row.version as string,
    plan_name: row.plan_name as string,
    plan_year: row.plan_year as number,
    deductible_individual: row.deductible_individual as number,
    deductible_family: row.deductible_family as number,
    oop_max_individual: row.oop_max_individual as number,
    oop_max_family: row.oop_max_family as number,
    coinsurance_rate: row.coinsurance_rate as number,
    copay_amount: (row.copay_amount as number | null) ?? undefined,
    copay_applies_to: (row.copay_applies_to as string[] | null) ?? undefined,
    cob_policy: row.cob_policy as PlanBenefits["cob_policy"],
    covered_services: (row.covered_services as PlanBenefits["covered_services"] | null) ?? [],
  };
}

/** Mirrors accumulatorRepository.ts's fetchMemberAccumulators(). */
export async function fetchMemberAccumulators(
  memberId: string,
  planYear: number,
): Promise<MemberAccumulators | null> {
  const { data, error } = await supabase
    .from("member_accumulators")
    .select("payload")
    .eq("member_id", memberId)
    .eq("plan_year", planYear)
    .maybeSingle();
  if (error)
    throw new Error(`Failed to fetch accumulators for member ${memberId}: ${error.message}`);
  if (!data?.payload) return null;
  return data.payload as MemberAccumulators;
}

/** Mirrors accumulatorRepository.ts's saveMemberAccumulators(). */
export async function saveMemberAccumulators(accumulators: MemberAccumulators): Promise<void> {
  const { error } = await supabase.from("member_accumulators").upsert(
    {
      member_id: accumulators.member_id,
      plan_year: accumulators.plan_year,
      payload: accumulators,
    },
    { onConflict: "member_id,plan_year" },
  );
  if (error) {
    throw new Error(
      `Failed to save updated accumulators for member ${accumulators.member_id}: ${error.message}`,
    );
  }
}

export interface KillSwitchState {
  active: boolean;
  reason: string | null;
}

/** Mirrors src/lib/guardian-kill-switch.ts's fetchKillSwitch(). */
export async function fetchKillSwitch(): Promise<KillSwitchState> {
  const { data, error } = await supabase
    .from("guardian_kill_switch")
    .select("active, reason")
    .eq("id", "global")
    .single();
  if (error) throw new Error(`Failed to fetch kill switch: ${error.message}`);
  return data as KillSwitchState;
}

/**
 * Fixed-window rate limit, keyed by client_id -- see
 * supabase/migrations/20260916_api_rate_limits.sql for why this is a
 * DB-backed atomic counter rather than an in-memory one (Edge
 * Functions have no shared, persistent memory across invocations).
 * Fails OPEN on an infrastructure error: a rate-limiter outage
 * shouldn't itself take down claims adjudication, unlike the kill
 * switch's fail-closed convention, which guards a deliberate safety
 * decision rather than an abuse-prevention accounting mechanism.
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
    console.error("[adjudicate-claim] rate limit check failed, failing open:", error.message);
    return true;
  }
  return data as boolean;
}

/**
 * Durable, queryable record of this function's business-outcome
 * events -- see supabase/migrations/20260916b_api_activity.sql for
 * why this exists alongside (not instead of) console.log: it's what
 * the admin UI's Command Center dashboard actually queries. Never
 * blocks or fails the response -- an activity-logging outage
 * shouldn't itself affect claims adjudication, same rationale as
 * checkRateLimit's fail-open convention.
 */
export async function recordActivity(
  clientId: string,
  outcome: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("api_activity")
    .insert({ client_id: clientId, endpoint: "adjudicate_claim", outcome, detail });
  if (error) {
    console.error("[adjudicate-claim] failed to record activity:", error.message);
  }
}

/**
 * Real API-key auth: compares the SHA-256 hash of the caller's key
 * against api_clients.key_hash. No plaintext key is ever stored.
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
