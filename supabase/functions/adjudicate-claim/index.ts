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
  checkRateLimit,
  recordActivity,
  getCachedReplay,
  saveReplayCache,
} from "./repo.ts";
import { adjudicateClaim, updateMemberAccumulators } from "./calculationEngine.ts";
import type {
  ClaimLine,
  MemberAccumulators,
  ContractTerms,
  PlanBenefits,
  PriorPayerOutcome,
  AdjudicationRun,
  TraceObject,
} from "./types.ts";

// X-Api-Version identifies this response as coming from v1 of the
// contract documented in docs/api/nucleus-external-api.yaml. This
// path (/adjudicate-claim) is v1 for as long as it exists -- a
// breaking change ships as a new sibling endpoint (e.g.
// /adjudicate-claim-v2) instead of changing what this one returns,
// so a caller pinned to this URL never has its contract change out
// from under it. See docs/api/VERSIONING.md.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Api-Version": "v1",
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

/**
 * "resolved" mode -- the caller (DualPay) has already looked up its
 * own real, live contract/plan/accumulators (the same way it always
 * has, via its own correctly-scoped queries) and sends them directly,
 * rather than asking this function to resolve them from nucleus's own
 * separate contract database. nucleus's own payer_contracts/
 * plan_benefits/member_accumulators tables hold only nucleus's own
 * test/seed data -- they were never DualPay's real data, and
 * resolveContract()/resolvePlan()/fetchMemberAccumulators() below (the
 * legacy path) can only ever adjudicate against that, not against
 * DualPay's actual customer contracts. This mode makes nucleus a pure,
 * stateless calculation service for a caller that already owns its own
 * real data -- fixing that gap without requiring cross-project
 * credential sharing or a data-sync pipeline.
 *
 * fee_schedule is a plain object (procedure_code -> allowed_cents) on
 * the wire since ContractTerms.fee_schedule is a Map, which does not
 * survive JSON.stringify.
 */
interface ResolvedAdjudicateRequest {
  mode: "resolved";
  claim_id: string;
  lines: ClaimLine[];
  accumulators: MemberAccumulators;
  contract: Omit<ContractTerms, "fee_schedule"> & { fee_schedule: Record<string, number> };
  plan: PlanBenefits;
  prior_outcomes?: PriorPayerOutcome[];
  /** A real content fingerprint the caller already computed (e.g.
   * DualPay's own buildTraceFingerprint()) -- enables the idempotency
   * cache below, and is also threaded through as the kernel's own
   * traceFingerprint (see AdjudicationOptions) so a caller's persisted
   * run/trace carry ITS real fingerprint, not a generic
   * "unfingerprinted_..." placeholder the kernel falls back to when no
   * options are given. Optional: a caller without its own
   * fingerprinting still gets correct results, just with the kernel's
   * own defaults for these identifiers instead. */
  idempotency_key?: string;
  /** Caller-computed run_id/trace_id/timestamp/snapshot_ref -- passed
   * straight through as the kernel's AdjudicationOptions so a
   * caller's own deterministic IDs (e.g. DualPay's
   * run_${claimId}_${version} / trace_${claimId}_${fingerprint}) are
   * what actually get returned and persisted, not nucleus's internal
   * fallback ones. All optional; the kernel has sane defaults for any
   * omitted. */
  run_id?: string;
  timestamp?: string;
  snapshot_ref?: string;
  trace_id?: string;
}

function isResolvedRequest(body: unknown): body is ResolvedAdjudicateRequest {
  return !!body && typeof body === "object" && (body as { mode?: unknown }).mode === "resolved";
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
  planCeiling: {
    deductible_individual: number;
    deductible_family: number;
    oop_max_individual: number;
    oop_max_family: number;
  },
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

  const verified = await verifyApiKey(req.headers.get("x-api-key"));
  if (!verified) {
    return jsonResponse({ error: "Unauthorized: missing or invalid x-api-key" }, 401);
  }
  const { clientId, organizationId } = verified;

  // 120 requests/minute per caller -- generous for real traffic, real
  // enough to stop a runaway loop or leaked key from hammering the
  // adjudication kernel indefinitely.
  const withinLimit = await checkRateLimit(clientId, 60, 120);
  if (!withinLimit) {
    return jsonResponse({ error: "Rate limit exceeded: 120 requests/minute per client" }, 429);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (isResolvedRequest(rawBody)) {
    return handleResolvedRequest(rawBody, clientId);
  }

  const body = rawBody as AdjudicateRequest;

  if (!body.claim_id || !body.member_id || !body.payer_name || !body.procedure_code) {
    return jsonResponse(
      { error: "claim_id, member_id, payer_name, and procedure_code are required" },
      400,
    );
  }

  // A negative or non-finite billed_amount_cents (or units) previously
  // reached adjudicateClaim() unchecked, where a negative downstream
  // result trips calculationEngine.ts's assertLineInvariant() and
  // throws -- turning a bad request into an unhandled exception
  // instead of a clean 400.
  if (!Number.isFinite(body.billed_amount_cents) || body.billed_amount_cents < 0) {
    return jsonResponse({ error: "billed_amount_cents must be a non-negative number" }, 400);
  }
  if (body.units !== undefined && (!Number.isFinite(body.units) || body.units <= 0)) {
    return jsonResponse({ error: "units must be a positive number" }, 400);
  }

  const planYear = body.plan_year ?? new Date().getUTCFullYear();
  const serviceDate = body.service_date ?? new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString();

  // Structured business-outcome event -- console.log is queryable one
  // request at a time via Supabase's log viewer; recordActivity is the
  // durable, queryable-by-the-admin-UI version of the same event (see
  // supabase/migrations/20260916b_api_activity.sql). Fires once per
  // request on every decision path.
  const logOutcome = async (fields: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        event: "adjudicate_claim",
        client_id: clientId,
        claim_id: body.claim_id,
        timestamp,
        ...fields,
      }),
    );
    const { decision, ...detail } = fields;
    await recordActivity(clientId, String(decision ?? "unknown"), {
      claim_id: body.claim_id,
      ...detail,
    });
  };

  // Kill switch first, before any adjudication work -- fails closed
  // (denies) if its state can't be verified, same convention
  // guardianRuntime.ts uses.
  try {
    const killSwitch = await fetchKillSwitch();
    if (killSwitch.active) {
      await logOutcome({
        decision: "deny",
        reason_category: "kill_switch_active",
        risk_tier: "critical",
      });
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
    await logOutcome({
      decision: "deny",
      reason_category: "kill_switch_unverifiable",
      risk_tier: "critical",
    });
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
      resolveContract(body.payer_name, serviceDate, organizationId, body.provider_npi),
      resolvePlan(body.payer_name, serviceDate, organizationId),
    ]);
  } catch (err) {
    await logOutcome({ decision: "deny", reason_category: "resolve_error", risk_tier: "critical" });
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
    await logOutcome({
      decision: "no_contract_on_file",
      reason_category: !contract ? "no_contract" : "no_plan",
      risk_tier: "high",
      payer_name: body.payer_name,
    });
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
    const real = await fetchMemberAccumulators(body.member_id, planYear, organizationId);
    if (real) {
      accumulators = real;
    } else {
      accumulators = emptyAccumulators(body.member_id, planYear, plan);
      usedEmptyAccumulators = true;
    }
  } catch (err) {
    await logOutcome({
      decision: "deny",
      reason_category: "accumulators_unverifiable",
      risk_tier: "critical",
      contract_id: contract.contract_id,
      plan_id: plan.plan_id,
    });
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
    await saveMemberAccumulators(
      updateMemberAccumulators(accumulators, run.final_accumulator),
      organizationId,
    );
  } catch (err) {
    console.error(`Failed to persist updated accumulators for member ${body.member_id}:`, err);
  }

  const lineResult = run.line_results[0];
  const denied = lineResult.status === "denied" || lineResult.status === "benefit_limit_exhausted";
  const decision = denied ? "deny" : "allow";

  await logOutcome({
    decision,
    status: lineResult.status,
    risk_tier: computeRiskTier({ decision, failClosed: false, usedEmptyAccumulators }),
    used_empty_accumulators: usedEmptyAccumulators,
    plan_paid: lineResult.plan_paid,
    member_responsibility: lineResult.member_responsibility,
  });

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

/**
 * "resolved" mode handler -- see ResolvedAdjudicateRequest's comment
 * above for why this exists. Deliberately stateless: no accumulator
 * write-back here (unlike the legacy path's saveMemberAccumulators
 * call), since the accumulators this function was given belong to the
 * caller's own database, not nucleus's -- persisting the post-claim
 * accumulator state is the caller's own responsibility, the same way
 * it already resolves the pre-claim state itself.
 */
async function handleResolvedRequest(
  body: ResolvedAdjudicateRequest,
  clientId: string,
): Promise<Response> {
  const timestamp = new Date().toISOString();

  const logOutcome = async (fields: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        event: "adjudicate_claim_resolved",
        client_id: clientId,
        claim_id: body.claim_id,
        timestamp,
        ...fields,
      }),
    );
    const { decision, ...detail } = fields;
    await recordActivity(clientId, String(decision ?? "unknown"), {
      claim_id: body.claim_id,
      ...detail,
    });
  };

  if (!body.claim_id || !Array.isArray(body.lines) || body.lines.length === 0) {
    return jsonResponse({ error: "claim_id and a non-empty lines[] array are required" }, 400);
  }
  if (!body.accumulators || !body.contract || !body.plan) {
    return jsonResponse({ error: "accumulators, contract, and plan are all required" }, 400);
  }

  // Kill switch first, before any adjudication work -- same fail-closed
  // convention as the legacy path above.
  try {
    const killSwitch = await fetchKillSwitch();
    if (killSwitch.active) {
      await logOutcome({
        decision: "deny",
        reason_category: "kill_switch_active",
        risk_tier: "critical",
      });
      return jsonResponse({
        decision: "deny",
        reason: `Guardian kill switch is active: ${killSwitch.reason ?? "no reason given"}`,
        risk_tier: "critical",
        timestamp,
      });
    }
  } catch (err) {
    await logOutcome({
      decision: "deny",
      reason_category: "kill_switch_unverifiable",
      risk_tier: "critical",
    });
    return jsonResponse({
      decision: "deny",
      reason: `Unable to verify Guardian kill switch state: ${(err as Error).message}`,
      risk_tier: "critical",
      timestamp,
    });
  }

  if (body.idempotency_key) {
    const cached = await getCachedReplay(body.idempotency_key);
    if (cached) {
      await logOutcome({ decision: "replayed", idempotency_key: body.idempotency_key });
      return jsonResponse({
        decision: "allow",
        replayed: true,
        run: cached.run,
        trace: cached.trace,
        timestamp,
      });
    }
  }

  const contract: ContractTerms = {
    ...body.contract,
    fee_schedule: new Map(Object.entries(body.contract.fee_schedule)),
  };

  let run: AdjudicationRun, trace: TraceObject;
  try {
    ({ run, trace } = adjudicateClaim(
      body.lines,
      body.accumulators,
      contract,
      body.plan,
      body.prior_outcomes ?? [],
      {
        runId: body.run_id,
        timestamp: body.timestamp,
        traceFingerprint: body.idempotency_key,
        snapshotRef: body.snapshot_ref,
        traceId: body.trace_id,
      },
    ));
  } catch (err) {
    await logOutcome({ decision: "error", reason_category: "kernel_error" });
    return jsonResponse({ error: `Adjudication failed: ${(err as Error).message}` }, 400);
  }

  // Wire-safe: final_accumulator.benefit_limits_remaining is a Map,
  // which JSON.stringify silently drops (serializes to `{}`).
  const wireRun = {
    ...run,
    final_accumulator: {
      ...run.final_accumulator,
      benefit_limits_remaining: Object.fromEntries(run.final_accumulator.benefit_limits_remaining),
    },
  };

  if (body.idempotency_key) {
    await saveReplayCache(body.idempotency_key, clientId, wireRun, trace);
  }

  await logOutcome({
    decision: "allow",
    total_plan_paid: run.total_plan_paid,
    total_member_responsibility: run.total_member_responsibility,
    line_count: body.lines.length,
  });

  return jsonResponse({ decision: "allow", replayed: false, run: wireRun, trace, timestamp });
}
