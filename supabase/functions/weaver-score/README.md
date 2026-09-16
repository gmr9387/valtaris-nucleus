# weaver-score

Nucleus's real, external-facing Weaver scoring API — the same
rule-based engine `weaverRuntime.ts` runs internally, now callable by
any arm in the ecosystem that wants an opportunity score or a
recommendation confidence without re-implementing the scoring rules on
its own side.

## What this is

A Supabase Edge Function (Deno) wrapping the exact same rule
evaluation `weaverRuntime.ts` uses internally
(`src/engine/weaver-rule-evaluator.ts`, reading the same `weaver_rules`
table an operator edits in nucleus's admin UI). `ruleEvaluator.ts` and
`types.ts` here are ported verbatim from their `src/engine/*` /
`src/types/*` counterparts because Edge Functions run on Deno, not
Bun/Vite — if you change the scoring logic in one place, change it in
both.

An external caller gets the current live rule configuration, not a
stale copy baked into its own codebase — the same reason `adjudicate-claim`
exists rather than every arm reimplementing adjudication math.

## Auth

`x-api-key` header, checked against the same `api_clients.key_hash`
table `adjudicate-claim` uses (see that function's README) — one
credential authorizes both endpoints. `verify_jwt` is disabled since
callers are other services, not Supabase-authenticated end users.

## Deploying changes

This directory is the git-tracked source of truth; deploy it with the
Supabase CLI (`supabase functions deploy weaver-score`) or the
`deploy_edge_function` MCP tool, passing all files in this directory.

## Request / response

```
POST /functions/v1/weaver-score
x-api-key: <key>
Content-Type: application/json

{
  "stage": "opportunity" | "recommendation",
  "claim_id": "string (optional, echoed back for the caller's own correlation)",
  "facts": {
    "...": "arbitrary object — weaver_rules.field_path is a dot-path into this",
    "claimPayload": { "amount": "number, cents — drives the opportunity base score" }
  }
}
```

`facts` is intentionally open-ended: whatever fields nucleus's admin UI
has configured `weaver_rules.field_path` to reference (e.g.
`claimPayload.usedDemoContract`, `procedureCode`) must be present under
the same path in `facts` for that rule to be able to fire. A rule whose
path isn't present simply doesn't fire — it never errors.

Response (always 200 except auth/parse failures — a rule-fetch failure
degrades to the base value below rather than erroring):

```
// stage: "opportunity"
{
  "stage": "opportunity",
  "score": "number, 0-100 (claimPayload.amount / 20, plus fired-rule weight, clamped)",
  "fired_rules": "string[]",
  "claim_id": "string | null",
  "timestamp": "ISO datetime"
}

// stage: "recommendation"
{
  "stage": "recommendation",
  "confidence": "number, 0-1 (0.4 baseline plus fired-rule weight, clamped)",
  "action": "\"approve\" (confidence >= 0.55) | \"review\"",
  "fired_rules": "string[]",
  "claim_id": "string | null",
  "timestamp": "ISO datetime"
}
```
