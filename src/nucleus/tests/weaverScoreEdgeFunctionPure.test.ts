// Real tests for the previously-untested logic in
// supabase/functions/weaver-score: auth (key hashing) and org-scoping
// (which weaver_rules a caller's organizationId can see). Both were
// extracted into pure.ts specifically so they're testable from Vitest
// without needing to shim Deno globals or an "npm:" specifier import
// just to exercise a hash function and a filter-string decision.
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { hashApiKey, orgScopeFilter } from "../../../supabase/functions/weaver-score/pure.ts";

describe("weaver-score auth: hashApiKey", () => {
  it("matches an independently-computed SHA-256 hex digest (Node's own crypto, not the same code path)", async () => {
    const rawKey = "vnk_test-client_abc123";
    const expected = createHash("sha256").update(rawKey, "utf8").digest("hex");
    await expect(hashApiKey(rawKey)).resolves.toBe(expected);
  });

  it("produces different hashes for different keys", async () => {
    const a = await hashApiKey("key-one");
    const b = await hashApiKey("key-two");
    expect(a).not.toBe(b);
  });

  it("is deterministic -- the same key always hashes the same way", async () => {
    const a = await hashApiKey("stable-key");
    const b = await hashApiKey("stable-key");
    expect(a).toBe(b);
  });

  it("produces a 64-character lowercase hex string", async () => {
    const hash = await hashApiKey("any-key");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("weaver-score org-scoping: orgScopeFilter", () => {
  it("scopes to global-only rules when no organizationId is known", () => {
    expect(orgScopeFilter(null)).toEqual({ kind: "is_null" });
  });

  it("scopes to that org's rules plus global rules when an organizationId is given", () => {
    expect(orgScopeFilter("org-42")).toEqual({
      kind: "or",
      value: "organization_id.is.null,organization_id.eq.org-42",
    });
  });

  it("never produces a filter that could match every organization's rules unscoped", () => {
    const result = orgScopeFilter("org-A");
    // The filter must name org-A specifically -- it must not degrade to
    // an unscoped "match anything" clause that would leak org-B's rules.
    expect(result.kind).toBe("or");
    if (result.kind === "or") {
      expect(result.value).toContain("organization_id.eq.org-A");
      expect(result.value).not.toContain("org-B");
    }
  });
});
