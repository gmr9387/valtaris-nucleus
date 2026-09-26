// Pure, runtime-portable logic extracted out of repo.ts -- no Deno.env,
// no npm: specifier imports, so it's directly testable from Vitest
// (Node) the same way ruleEvaluator.ts already is, instead of needing
// to shim Deno globals or a Supabase client just to exercise these
// decisions. repo.ts imports and uses both functions below; this file
// holds no behavior repo.ts doesn't already have -- it's the same
// logic, just isolated so it can be verified directly.

/**
 * SHA-256 hex digest of a raw API key -- the same scheme
 * adjudicate-claim's own verifyApiKey uses, and the only thing
 * api_clients.key_hash is ever compared against. Uses the global
 * Web Crypto API (crypto.subtle), available in Deno, Node 18+, and
 * browsers alike -- nothing Deno-specific here.
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type OrgScopeFilter = { kind: "or"; value: string } | { kind: "is_null" };

/**
 * Decides how listWeaverRules() scopes its weaver_rules query by
 * tenant: a caller with a known organizationId sees that org's own
 * rules plus every global (organization_id IS NULL) rule; a caller
 * with no organizationId (organizationId is null) sees only the
 * global rules -- it can't see into any tenant's private rule set.
 */
export function orgScopeFilter(organizationId: string | null): OrgScopeFilter {
  return organizationId
    ? { kind: "or", value: `organization_id.is.null,organization_id.eq.${organizationId}` }
    : { kind: "is_null" };
}
