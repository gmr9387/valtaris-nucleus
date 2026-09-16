/**
 * POST /functions/v1/weaver-score
 *
 * Nucleus's real, external-facing Weaver scoring API -- the same
 * rule-based engine src/nucleus/subsystems/weaver/weaverRuntime.ts
 * runs internally for nucleus's own pipeline, now callable by any arm
 * in the ecosystem (DualPay, etc.) that wants an opportunity score or
 * a recommendation confidence without re-implementing the scoring
 * rules on its own side. Same weaver_rules table, same weights an
 * operator edits in nucleus's admin UI -- an external caller gets the
 * current live configuration, not a stale copy.
 *
 * Deliberately mirrors weaverRuntime.ts's two formulas exactly (see
 * that file's comments for why each constant is what it is):
 *   - opportunity: base score from facts.claimPayload.amount (amount/20,
 *     clamped to [0,100]) plus fired-rule weight, clamped again.
 *   - recommendation: 0.4 baseline confidence plus fired-rule weight,
 *     clamped to [0,1]; action is "approve" at >=0.55, else "review".
 * Rule-fetch failure fails *safe* to the base/baseline value alone --
 * Weaver is an advisory signal here too, not a gate, so a DB hiccup
 * degrades toward caution (lower score, "review") rather than blocking
 * the caller with an error.
 *
 * Auth: x-api-key header, checked against the same api_clients table
 * adjudicate-claim uses (see that function's repo.ts). verify_jwt is
 * disabled since callers are other services, not Supabase-authenticated
 * end users.
 */
import { listWeaverRules, verifyApiKey, checkRateLimit } from "./repo.ts";
import { evaluateRules } from "./ruleEvaluator.ts";
import type { WeaverRuleStage } from "./types.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AUTO_APPROVE_THRESHOLD = 0.55;

interface WeaverScoreRequest {
  stage: WeaverRuleStage;
  claim_id?: string;
  facts?: Record<string, unknown>;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
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

  const withinLimit = await checkRateLimit(clientId, 60, 120);
  if (!withinLimit) {
    return jsonResponse({ error: "Rate limit exceeded: 120 requests/minute per client" }, 429);
  }

  let body: WeaverScoreRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (body.stage !== "opportunity" && body.stage !== "recommendation") {
    return jsonResponse({ error: 'stage must be "opportunity" or "recommendation"' }, 400);
  }

  const facts = body.facts ?? {};
  const timestamp = new Date().toISOString();
  const claimId = body.claim_id ?? null;

  let ruleAdjustment = 0;
  let firedRules: string[] = [];
  try {
    const rules = await listWeaverRules(body.stage);
    const evaluation = evaluateRules(rules, facts);
    ruleAdjustment = evaluation.totalWeight;
    firedRules = evaluation.firedRules;
  } catch (err) {
    console.error(
      `[weaver-score] rule evaluation failed for stage ${body.stage}, using base value only:`,
      (err as Error).message,
    );
  }

  if (body.stage === "opportunity") {
    const claimPayload = facts.claimPayload as Record<string, unknown> | undefined;
    const amount = Number(claimPayload?.amount);
    const baseScore = Number.isFinite(amount) && amount > 0 ? Math.min(amount / 20, 100) : 0;
    const score = Math.max(0, Math.min(baseScore + ruleAdjustment, 100));

    return jsonResponse({
      stage: "opportunity",
      score,
      fired_rules: firedRules,
      claim_id: claimId,
      timestamp,
    });
  }

  const baseline = 0.4;
  const confidence = Math.round(Math.max(0, Math.min(baseline + ruleAdjustment, 1)) * 100) / 100;
  const action = confidence >= AUTO_APPROVE_THRESHOLD ? "approve" : "review";

  return jsonResponse({
    stage: "recommendation",
    confidence,
    action,
    fired_rules: firedRules,
    claim_id: claimId,
    timestamp,
  });
});
