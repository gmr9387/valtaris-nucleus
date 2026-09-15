/**
 * POST /functions/v1/adjudicate-claim
 *
 * Nucleus's real, external-facing adjudication API -- the "octopus
 * head" answering "what should this claim have paid" for any arm that
 * calls it (DualPay Core Ledger, first). Wraps the exact same
 * calculation kernel (calculationEngine.ts/traceBuilder.ts/cobRules.ts)
 * that guardianRuntime.ts uses internally, ported here because Edge
 * Functions run on Deno, not Bun/Vite -- see repo.ts's header for what
 * changed (only the Supabase client construction) and what didn't (the
 * math, verbatim).
 *
 * Deliberately different from guardianRuntime.ts in one respect: this
 * endpoint has NO demo-data fallback. guardianRuntime.ts falls back to
 * demoContract/demoPlan for nucleus's own internal UI convenience when
 * no real payer is on file -- silently doing that for an external
 * caller would hand back numbers that look real but aren't. Instead,
 * a payer/plan with no real contract on file gets an explicit
 * "no_contract_on_file" decision, not a guess.
 *
 * Auth: x-api-key header, checked against api_clients.key_hash (see
 * supabase/migrations/20260915d_api_clients.sql). verify_jwt is
 * disabled for this function since callers are other services (like
 * DualPay), not Supabase-authenticated end users.
 */
import {
  resolveContract,
  resolvePlan,
  fetchMemberAccumulators,
  saveMemberAccumulators,
  fetchKillSwitch,
  verifyApiKey,
} from "./repo.ts";
import { adjudicateClaim, updateMemberAccumulators } from "./calculationEngine.ts";
import type { ClaimLine, MemberAccumulators } from "./types.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AdjudicateRequest {
  claim_id: string;
  member_id: string;
  plan_year?: number;
  payer_name: string;
  provider_npi?: string;
  procedure_code: string;
  diagnosis_codes?: string[];
  billed_amount_cents: number;
  units?: number;
  place_of_service?: string;
  service_date?: string;
}

type RiskTier = "low" | "medium" | "high" | "critical";

function computeRiskTier(args: {
  decision: "allow" | "deny";
  failClosed: boolean;
  usedEmptyAccumulators: boolean;
}): RiskTier {
  if (args.failClosed) return "critical";
  if (args.decision === "deny") return "high";
  if (args.usedEmptyAccumulators) return "medium";
  return "low";
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function emptyAccumulators(
  memberId: string,
  planYear: number,
  planCeiling: { deductible_individual: number; deductible_family: number; oop_max_individual: number; oop_max_family: number },
): MemberAccumulators {
  return {
    member_id: memberId,
    plan_year: planYear,
    individual_deductible_used: 0,
    individual_deductible_max: planCeiling.deductible_individual,
    family_deductible_used: 0,
    family_deductible_max: planCeiling.deductible_family,
    individual_oop_used: 0,
    individual_oop_max: planCeiling.oop_max_individual,
    family_oop_used: 0,
    family_oop_max: planCeiling.oop_max_family,
    benefit_limits: [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const clientId = await verifyApiKey(req.headers.get("x-api-key"));
  if (!clientId) {
    return jsonResponse({ error: "Unauthorized: missing or invalid x-api-key" }, 401);
  }

  let body: AdjudicateRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.claim_id || !body.member_id || !body.payer_name || !body.procedure_code) {
    return jsonResponse(
      { error: "claim_id, member_id, payer_name, and procedure_code are required" },
      400,
    );
  }

  const planYear = body.plan_year ?? new Date().getUTCFullYear();
  const serviceDate = body.service_date ?? new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString();

  // Kill switch first, before any adjudication work -- fails closed
  // (denies) if its state can't be verified, same convention
  // guardianRuntime.ts uses.
  try {
    const killSwitch = await fetchKillSwitch();
    if (killSwitch.active) {
      return jsonResponse({
        decision: "deny",
        reason: `Guardian kill switch is active: ${killSwitch.reason ?? "no reason given"}`,
        risk_tier: "critical",
        contract_id: null,
        plan_id: null,
        timestamp,
      });
    }
  } catch (err) {
    return jsonResponse({
      decision: "deny",
      reason: `Unable to verify Guardian kill switch state: ${(err as Error).message}`,
      risk_tier: "critical",
      contract_id: null,
      plan_id: null,
      timestamp,
    });
  }

  // Real contract and plan are required -- no demo fallback for an
  // external caller (see this file's header).
  let contract, plan;
  try {
    [contract, plan] = await Promise.all([
      resolveContract(body.payer_name, serviceDate, body.provider_npi),
      resolvePlan(body.payer_name, serviceDate),
    ]);
  } catch (err) {
    return jsonResponse({
      decision: "deny",
      reason: `Unable to resolve contract/plan: ${(err as Error).message}`,
      risk_tier: "critical",
      contract_id: null,
      plan_id: null,
      timestamp,
    });
  }

  if (!contract || !plan) {
    return jsonResponse({
      decision: "no_contract_on_file",
      reason: !contract
        ? `No active payer contract on file for "${body.payer_name}" as of ${serviceDate}.`
        : `No active plan benefits on file for "${body.payer_name}" as of ${serviceDate}.`,
      risk_tier: "high",
      contract_id: contract?.contract_id ?? null,
      plan_id: plan?.plan_id ?? null,
      timestamp,
    });
  }

  // Real plan resolved, so an empty accumulator record uses this
  // plan's real limits as its ceiling -- not a demo plan's, unlike
  // guardianRuntime.ts's internal fallback (which resolves accumulators
  // before the plan and so can't do this).
  let accumulators: MemberAccumulators;
  let usedEmptyAccumulators = false;
  try {
    const real = await fetchMemberAccumulators(body.member_id, planYear);
    if (real) {
      accumulators = real;
    } else {
      accumulators = emptyAccumulators(body.member_id, planYear, plan);
      usedEmptyAccumulators = true;
    }
  } catch (err) {
    return jsonResponse({
      decision: "deny",
      reason: `Unable to verify member accumulators: ${(err as Error).message}`,
      risk_tier: "critical",
      contract_id: contract.contract_id,
      plan_id: plan.plan_id,
      timestamp,
    });
  }

  const line: ClaimLine = {
    line_id: `${body.claim_id}-L1`,
    claim_id: body.claim_id,
    service_date: serviceDate,
    claim_line_number: 1,
    procedure_code: body.procedure_code,
    diagnosis_codes: body.diagnosis_codes ?? [],
    billed_amount: body.billed_amount_cents,
    units: body.units ?? 1,
    place_of_service: body.place_of_service ?? "11",
  };

  const { run } = adjudicateClaim([line], accumulators, contract, plan);

  try {
    await saveMemberAccumulators(updateMemberAccumulators(accumulators, run.final_accumulator));
  } catch (err) {
    console.error(`Failed to persist updated accumulators for member ${body.member_id}:`, err);
  }

  const lineResult = run.line_results[0];
  const denied = lineResult.status === "denied" || lineResult.status === "benefit_limit_exhausted";
  const decision = denied ? "deny" : "allow";

  return jsonResponse({
    decision,
    reason: denied
      ? (lineResult.denial_reasons?.[0] ?? `Adjudication status: ${lineResult.status}`)
      : `Adjudicated: plan pays $${(lineResult.plan_paid / 100).toFixed(2)}, member owes $${(lineResult.member_responsibility / 100).toFixed(2)}`,
    adjudication: {
      status: lineResult.status,
      allowed: lineResult.allowed,
      plan_paid: lineResult.plan_paid,
      member_responsibility: lineResult.member_responsibility,
      deductible_applied: lineResult.deductible_applied,
      coinsurance: lineResult.coinsurance,
    },
    risk_tier: computeRiskTier({ decision, failClosed: false, usedEmptyAccumulators }),
    used_empty_accumulators: usedEmptyAccumulators,
    contract_id: contract.contract_id,
    plan_id: plan.plan_id,
    timestamp,
  });
});
