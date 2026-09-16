/**
 * POST /functions/v1/command-center-stats
 *
 * Backs the admin UI's Command Center page -- the ecosystem-wide view
 * nucleus's admin UI didn't have until now: every other tab manages
 * nucleus's own internal data (contracts, plan benefits, Weaver
 * rules), not who's actually calling nucleus's external API surface
 * or what they're getting back. This aggregates api_clients,
 * api_rate_limits, and api_activity -- all three intentionally have
 * zero RLS policies (service-role only, same rationale as
 * manage-api-clients's own header) -- into one read-only response.
 *
 * verify_jwt is left ENABLED (unlike this project's x-api-key
 * external APIs): this is reachable only by a signed-in nucleus user,
 * same as manage-api-clients's "list" action. No owner/admin gate --
 * viewing ecosystem activity is visibility, not a control action, same
 * tier as reading the client list itself.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface ClientStats {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [clientsRes, rateLimitsRes, activityRes, feedRes] = await Promise.all([
    supabase
      .from("api_clients")
      .select("client_id, label, enabled, created_at, organization_id, organizations(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("api_rate_limits")
      .select("client_id, request_count, window_start")
      .gte("window_start", oneHourAgo),
    supabase
      .from("api_activity")
      .select("client_id, endpoint, outcome")
      .gte("occurred_at", oneDayAgo),
    supabase
      .from("api_activity")
      .select("client_id, endpoint, outcome, detail, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(50),
  ]);

  if (clientsRes.error) return jsonResponse({ error: clientsRes.error.message }, 500);
  if (rateLimitsRes.error) return jsonResponse({ error: rateLimitsRes.error.message }, 500);
  if (activityRes.error) return jsonResponse({ error: activityRes.error.message }, 500);
  if (feedRes.error) return jsonResponse({ error: feedRes.error.message }, 500);

  // Aggregated in JS rather than via PostgREST's aggregate-function
  // select syntax -- simpler and more reliable at the row volumes this
  // endpoint deals with (per-hour/per-day windows, not the full table).
  const volumeByClient = new Map<string, { requests: number; lastSeen: string | null }>();
  for (const row of rateLimitsRes.data ?? []) {
    const existing = volumeByClient.get(row.client_id) ?? { requests: 0, lastSeen: null };
    existing.requests += row.request_count as number;
    if (!existing.lastSeen || row.window_start > existing.lastSeen) {
      existing.lastSeen = row.window_start as string;
    }
    volumeByClient.set(row.client_id, existing);
  }

  const outcomesByClient = new Map<string, Record<string, Record<string, number>>>();
  for (const row of activityRes.data ?? []) {
    const byEndpoint = outcomesByClient.get(row.client_id) ?? {};
    const byOutcome = byEndpoint[row.endpoint] ?? {};
    byOutcome[row.outcome] = (byOutcome[row.outcome] ?? 0) + 1;
    byEndpoint[row.endpoint] = byOutcome;
    outcomesByClient.set(row.client_id, byEndpoint);
  }

  const clients: ClientStats[] = (clientsRes.data ?? []).map((client) => {
    // PostgREST embeds the many-to-one organizations relation as a
    // single object (or null when organization_id is null) -- never
    // an array, since api_clients.organization_id -> organizations.id
    // is unambiguous.
    const organization = client.organizations as { name: string } | null;
    return {
      client_id: client.client_id as string,
      label: client.label as string | null,
      enabled: client.enabled as boolean,
      created_at: client.created_at as string,
      organization_id: client.organization_id as string | null,
      organization_name: organization?.name ?? null,
      requests_last_hour: volumeByClient.get(client.client_id as string)?.requests ?? 0,
      last_seen: volumeByClient.get(client.client_id as string)?.lastSeen ?? null,
      outcomes_last_24h: outcomesByClient.get(client.client_id as string) ?? {},
    };
  });

  return jsonResponse({ clients, recent_activity: feedRes.data ?? [] });
});
