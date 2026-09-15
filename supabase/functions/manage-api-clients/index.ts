/**
 * POST /functions/v1/manage-api-clients
 *
 * The ONLY sanctioned way for nucleus's own admin UI to touch the
 * api_clients table. That table deliberately has zero RLS policies
 * (see supabase/migrations/20260915d_api_clients.sql's header) --
 * readable only by the service-role key, never by an authenticated
 * end user or the anon key, since it holds the credentials that gate
 * every external caller of adjudicate-claim/weaver-score/guardian-status.
 * This function is the narrow, purpose-built exception: it holds the
 * service-role key internally, but is itself only reachable by a
 * signed-in nucleus user (verify_jwt is left ENABLED, unlike this
 * project's external-facing APIs) -- it is never exposed to the
 * general PostgREST table surface the way an RLS policy would expose it.
 *
 * Before this existed, provisioning a new external caller required
 * hand-running SQL (see that migration's own comment for the insert
 * pattern this replaces). This lets an operator onboard a new
 * ecosystem arm through the UI instead.
 *
 * Same "never store plaintext" contract as everywhere else in this
 * project: a raw key exists only in this function's memory for the
 * duration of one request, is hashed before touching the database, and
 * is returned to the caller exactly once, in the response body, never
 * persisted or logged.
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

interface ApiClientRow {
  client_id: string;
  label: string | null;
  enabled: boolean;
  created_at: string;
}

type ManageRequest =
  | { action: "list" }
  | { action: "create"; client_id: string; label: string }
  | { action: "rotate"; client_id: string }
  | { action: "set_enabled"; client_id: string; enabled: boolean };

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(clientId: string): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const randomPart = btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `vnk_${clientId}_${randomPart}`;
}

const CLIENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // verify_jwt (enabled for this function, unlike this project's
  // x-api-key-authenticated external APIs) already rejected any caller
  // without a valid Supabase session before this code runs -- this is
  // an authenticated-user-only surface, not a public one.

  let body: ManageRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (body.action === "list") {
    const { data, error } = await supabase
      .from("api_clients")
      .select("client_id, label, enabled, created_at")
      .order("created_at", { ascending: false });
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ clients: (data ?? []) as ApiClientRow[] });
  }

  if (body.action === "create") {
    const clientId = (body.client_id ?? "").trim().toLowerCase();
    const label = (body.label ?? "").trim();
    if (!CLIENT_ID_PATTERN.test(clientId)) {
      return jsonResponse(
        {
          error:
            "client_id must be 3-64 lowercase letters/digits/hyphens, not starting or ending with a hyphen",
        },
        400,
      );
    }
    if (!label) {
      return jsonResponse({ error: "label is required" }, 400);
    }

    const rawKey = generateRawKey(clientId);
    const key_hash = await sha256Hex(rawKey);

    const { data, error } = await supabase
      .from("api_clients")
      .insert({ client_id: clientId, label, key_hash, enabled: true } as never)
      .select("client_id, label, enabled, created_at")
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ client: data as ApiClientRow, raw_key: rawKey });
  }

  if (body.action === "rotate") {
    const clientId = (body.client_id ?? "").trim();
    if (!clientId) return jsonResponse({ error: "client_id is required" }, 400);

    const rawKey = generateRawKey(clientId);
    const key_hash = await sha256Hex(rawKey);

    const { error } = await supabase
      .from("api_clients")
      .update({ key_hash } as never)
      .eq("client_id", clientId);
    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ raw_key: rawKey });
  }

  if (body.action === "set_enabled") {
    const clientId = (body.client_id ?? "").trim();
    if (!clientId) return jsonResponse({ error: "client_id is required" }, 400);

    const { data, error } = await supabase
      .from("api_clients")
      .update({ enabled: body.enabled } as never)
      .eq("client_id", clientId)
      .select("client_id, label, enabled, created_at")
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);

    return jsonResponse({ client: data as ApiClientRow });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
});
