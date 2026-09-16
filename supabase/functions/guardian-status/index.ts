/**
 * GET /functions/v1/guardian-status
 *
 * Nucleus's real, external-facing Guardian safety-status API -- the
 * third leg of the octopus-head API trio alongside adjudicate-claim
 * and weaver-score. Answers one question for any arm in the
 * ecosystem: "is it currently safe to keep processing claims?"
 *
 * This exists because guardianRuntime.ts's kill switch is currently
 * only visible from *inside* nucleus -- an arm running its own local
 * calculation engine (DualPay's calculation-engine.ts, for example)
 * has no way to know nucleus's operator flipped the kill switch. This
 * endpoint doesn't change what any arm calculates; it gives them the
 * option to check the same safety signal nucleus's own pipeline
 * already fails closed on, without adopting nucleus's adjudication
 * logic wholesale.
 *
 * Auth: x-api-key header, checked against the same api_clients table
 * adjudicate-claim and weaver-score use. verify_jwt is disabled since
 * callers are other services, not Supabase-authenticated end users.
 *
 * Deliberately read-only: this endpoint cannot activate or deactivate
 * the kill switch -- that stays an operator action inside nucleus's
 * own admin UI, gated to owner/admin roles. An external arm can only
 * ask, never tell.
 */
import { fetchKillSwitch, verifyApiKey, checkRateLimit } from "./repo.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const clientId = await verifyApiKey(req.headers.get("x-api-key"));
  if (!clientId) {
    return jsonResponse({ error: "Unauthorized: missing or invalid x-api-key" }, 401);
  }

  // Far more generous than adjudicate-claim/weaver-score's 120/min --
  // this endpoint is meant to be polled cheaply and often (see this
  // file's header and the DualPay proxy's own README).
  const withinLimit = await checkRateLimit(clientId, 60, 600);
  if (!withinLimit) {
    return jsonResponse({ error: "Rate limit exceeded: 600 requests/minute per client" }, 429);
  }

  const timestamp = new Date().toISOString();

  try {
    const killSwitch = await fetchKillSwitch();
    return jsonResponse({
      safe_to_process: !killSwitch.active,
      kill_switch_active: killSwitch.active,
      reason: killSwitch.reason,
      activated_by: killSwitch.activated_by,
      kill_switch_updated_at: killSwitch.updated_at,
      timestamp,
    });
  } catch (err) {
    // Same fail-closed convention as adjudicate-claim/index.ts and
    // guardianRuntime.ts: if the switch's own state can't be verified,
    // report unsafe rather than guessing "probably fine."
    return jsonResponse({
      safe_to_process: false,
      kill_switch_active: null,
      reason: `Unable to verify Guardian kill switch state: ${(err as Error).message}`,
      activated_by: null,
      kill_switch_updated_at: null,
      timestamp,
    });
  }
});
