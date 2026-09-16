/**
 * POST /functions/v1/manage-sso
 *
 * The only sanctioned way the admin UI touches organization_sso_configs
 * AND the only place that registers SAML providers with Supabase.
 *
 * IMPORTANT, and easy to get wrong: on a hosted (supabase.co) project,
 * SAML SSO provider registration is NOT a project-level, service-role-key
 * operation. It's a platform-level operation on Supabase's own
 * Management API (api.supabase.com), the same one `supabase sso add`
 * uses under the hood -- authenticated with a Supabase *personal access
 * token* (a platform credential, scoped to the account managing this
 * project), not this project's service-role key. That's also why
 * @supabase/supabase-js's admin client (supabase.auth.admin) has no
 * createSSOProvider/updateSSOProvider/deleteSSOProvider methods --
 * confirmed against the installed auth-js d.ts, which only exposes mfa/
 * oauth/customProviders/passkey there. (The project's own GoTrue admin
 * REST endpoint, /auth/v1/admin/sso/providers, is real but is only
 * documented for self-hosted Supabase, not this hosted project.)
 *
 * So this function calls the Management API directly over HTTP, using a
 * PAT stored as the SUPABASE_MANAGEMENT_API_TOKEN secret -- which must
 * be created by whoever owns this Supabase project (Settings -> Access
 * Tokens) and set via `supabase secrets set`. Until that secret exists,
 * every upsert fails cleanly with status "error" and a last_error that
 * says exactly that, same as the separate "plan doesn't support SAML"
 * failure -- both are expected, handled outcomes on a project that
 * hasn't been provisioned for enterprise SSO yet, not bugs.
 *
 * verify_jwt is left ENABLED (internal, same convention as
 * manage-api-clients): it proves "signed in," not "owner/admin of this
 * org," which is checked explicitly below since assigning an email
 * domain to an external identity provider is credential-adjacent, not
 * routine config.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MANAGEMENT_API_TOKEN = Deno.env.get("SUPABASE_MANAGEMENT_API_TOKEN") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// SUPABASE_URL is always https://<project-ref>.supabase.co for a hosted project.
const PROJECT_REF = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(SUPABASE_URL)?.[1] ?? "";

async function resolveCallerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user.id;
}

async function callerIsOrgAdmin(callerId: string | null, organizationId: string): Promise<boolean> {
  if (!callerId) return false;
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", callerId)
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"])
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

interface SsoConfigRow {
  id: string;
  organization_id: string;
  domain: string;
  sso_provider_id: string | null;
  status: "pending" | "active" | "error";
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

type ManageRequest =
  | { action: "get"; organization_id: string }
  | {
      action: "upsert";
      organization_id: string;
      domain: string;
      metadata_url?: string;
      metadata_xml?: string;
    }
  | { action: "delete"; organization_id: string };

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

interface ManagementApiResult {
  ok: boolean;
  id: string | null;
  errorMessage: string | null;
}

/** POST creates, PUT updates, DELETE removes. All return this same shape. */
async function callManagementApi(
  method: "POST" | "PUT" | "DELETE",
  providerId: string | null,
  body: Record<string, unknown> | null,
): Promise<ManagementApiResult> {
  if (!MANAGEMENT_API_TOKEN || !PROJECT_REF) {
    return {
      ok: false,
      id: null,
      errorMessage:
        "SUPABASE_MANAGEMENT_API_TOKEN is not configured for this Edge Function -- SAML provider registration requires a Supabase personal access token, set as an Edge Function secret by the project owner.",
    };
  }

  const path = providerId
    ? `/v1/projects/${PROJECT_REF}/config/auth/sso/providers/${providerId}`
    : `/v1/projects/${PROJECT_REF}/config/auth/sso/providers`;

  let response: Response;
  try {
    response = await fetch(`https://api.supabase.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${MANAGEMENT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (fetchError) {
    return { ok: false, id: null, errorMessage: (fetchError as Error).message };
  }

  if (!response.ok) {
    let detail = `Management API returned ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody?.message ?? errorBody?.error ?? detail;
    } catch {
      // response body wasn't JSON -- keep the generic status-based message
    }
    if (response.status === 404) {
      detail +=
        " (this usually means SAML 2.0 isn't enabled on this project's plan -- it requires Pro or above)";
    }
    return { ok: false, id: null, errorMessage: detail };
  }

  if (method === "DELETE") return { ok: true, id: providerId, errorMessage: null };

  const data = await response.json();
  return { ok: true, id: data?.id ?? providerId, errorMessage: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: ManageRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.organization_id) {
    return jsonResponse({ error: "organization_id is required" }, 400);
  }
  const callerId = await resolveCallerId(req);
  if (!(await callerIsOrgAdmin(callerId, body.organization_id))) {
    return jsonResponse({ error: "Owner or admin role in this organization required" }, 403);
  }

  if (body.action === "get") {
    const { data, error } = await supabase
      .from("organization_sso_configs")
      .select(
        "id, organization_id, domain, sso_provider_id, status, last_error, created_at, updated_at",
      )
      .eq("organization_id", body.organization_id)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ config: (data ?? null) as SsoConfigRow | null });
  }

  if (body.action === "upsert") {
    const domain = (body.domain ?? "").trim().toLowerCase();
    const metadataUrl = (body.metadata_url ?? "").trim();
    const metadataXml = (body.metadata_xml ?? "").trim();

    if (!DOMAIN_PATTERN.test(domain)) {
      return jsonResponse({ error: "domain must be a valid DNS domain, e.g. acme.com" }, 400);
    }
    if (!metadataUrl && !metadataXml) {
      return jsonResponse({ error: "metadata_url or metadata_xml is required" }, 400);
    }
    if (metadataUrl && metadataXml) {
      return jsonResponse({ error: "provide metadata_url or metadata_xml, not both" }, 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from("organization_sso_configs")
      .select("id, sso_provider_id")
      .eq("organization_id", body.organization_id)
      .maybeSingle();
    if (existingError) return jsonResponse({ error: existingError.message }, 500);

    // created_by is set only on first insert -- a later reconfiguration
    // by a different admin shouldn't rewrite who originally set this up.
    async function saveConfigRow(fields: {
      sso_provider_id: string | null;
      status: "active" | "error";
      last_error: string | null;
    }) {
      const columns =
        "id, organization_id, domain, sso_provider_id, status, last_error, created_at, updated_at";
      if (existing) {
        return await supabase
          .from("organization_sso_configs")
          .update({ domain, ...fields } as never)
          .eq("id", existing.id)
          .select(columns)
          .single();
      }
      return await supabase
        .from("organization_sso_configs")
        .insert({
          organization_id: body.organization_id,
          domain,
          created_by: callerId,
          ...fields,
        } as never)
        .select(columns)
        .single();
    }

    const providerAttrs = metadataUrl
      ? { metadata_url: metadataUrl, domains: [domain] }
      : { metadata_xml: metadataXml, domains: [domain] };

    const providerResult = existing?.sso_provider_id
      ? await callManagementApi("PUT", existing.sso_provider_id, providerAttrs)
      : await callManagementApi("POST", null, { type: "saml", ...providerAttrs });

    if (!providerResult.ok) {
      const message = providerResult.errorMessage ?? "Management API call failed";
      const { data, error } = await saveConfigRow({
        sso_provider_id: existing?.sso_provider_id ?? null,
        status: "error",
        last_error: message,
      });
      if (error) return jsonResponse({ error: error.message }, 500);
      // 200, not an error status: a Management API failure (missing
      // secret, plan doesn't support SAML, ...) is an expected, handled
      // business outcome, not a request problem -- the row is saved
      // with status "error" and the caller reads that off `config`,
      // same shape as success. A non-2xx here would make `config`
      // unreachable: supabase.functions.invoke() throws before parsing
      // the body of any non-ok response, discarding it.
      return jsonResponse({ config: data as SsoConfigRow, error: message });
    }

    const { data, error } = await saveConfigRow({
      sso_provider_id: providerResult.id,
      status: "active",
      last_error: null,
    });
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ config: data as SsoConfigRow });
  }

  if (body.action === "delete") {
    const { data: existing, error: existingError } = await supabase
      .from("organization_sso_configs")
      .select("id, sso_provider_id")
      .eq("organization_id", body.organization_id)
      .maybeSingle();
    if (existingError) return jsonResponse({ error: existingError.message }, 500);

    if (existing?.sso_provider_id) {
      const deleteResult = await callManagementApi("DELETE", existing.sso_provider_id, null);
      // Best-effort: if the Management API side fails (e.g. already
      // gone, token missing), still remove our local row rather than
      // leaving the admin unable to reconfigure this org's SSO at all.
      if (!deleteResult.ok) {
        console.log("[manage-sso] Management API delete failed, removing local row anyway", {
          organization_id: body.organization_id,
          error: deleteResult.errorMessage,
        });
      }
    }

    const { error } = await supabase
      .from("organization_sso_configs")
      .delete()
      .eq("organization_id", body.organization_id);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
});
