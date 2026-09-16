# adjudicate-claim

Nucleus's real, external-facing adjudication API — the first concrete
step toward nucleus acting as the ecosystem's "octopus head": other
services (DualPay Core Ledger, first) can call this to get a real,
contract- and plan-backed adjudication decision instead of running
their own local copy of the same math.

## What this is

A Supabase Edge Function (Deno) wrapping the exact same calculation
kernel `guardianRuntime.ts` uses internally
(`src/nucleus/subsystems/guardian/adjudication/calculationEngine.ts`,
`traceBuilder.ts`, `cobRules.ts`), ported here verbatim because Edge
Functions run on Deno, not Bun/Vite. `repo.ts` is the one file that's
genuinely different from its `src/lib/*`/`src/engine/*` counterparts —
same tables, same columns, same Supabase project, just a Deno-native
client construction (`Deno.env.get` instead of `import.meta.env`, and
the service-role key Supabase auto-injects into every Edge Function).

Deliberately **does not** fall back to demo contract/plan data the way
`guardianRuntime.ts` does for nucleus's own internal UI convenience —
an external caller with no real contract on file gets an explicit
`no_contract_on_file` decision, never a number that looks real but
isn't.

## Auth

`x-api-key` header, checked against `api_clients.key_hash` (SHA-256 —
no plaintext key is ever stored; see
`supabase/migrations/20260915d_api_clients.sql`). `verify_jwt` is
disabled for this function since callers are other services, not
Supabase-authenticated end users of this project.

To provision a new caller:

```sql
insert into api_clients (client_id, key_hash, label)
values ('<client_id>', '<sha256 hex of a real random key>', '<label>');
```

Hand the raw key to that caller once — it is never recoverable from the
database afterward.

## Deploying changes

This directory is the git-tracked source of truth; deploy it with the
Supabase CLI (`supabase functions deploy adjudicate-claim`) or the
`deploy_edge_function` MCP tool, passing all files in this directory.
`types.ts` is imported everywhere via `import type`, which TypeScript
erases at compile time — don't be alarmed if a deployed-function
listing doesn't show it as a separate runtime file; nothing ever
resolves it at runtime.

## Request / response

```
POST /functions/v1/adjudicate-claim
x-api-key: <key>
Content-Type: application/json

{
  "claim_id": "string (required)",
  "member_id": "string (required)",
  "payer_name": "string (required)",
  "procedure_code": "string (required)",
  "plan_year": "number (optional, defaults to current year)",
  "provider_npi": "string (optional)",
  "diagnosis_codes": "string[] (optional)",
  "billed_amount_cents": "number",
  "units": "number (optional, defaults to 1)",
  "place_of_service": "string (optional, defaults to \"11\")",
  "service_date": "string, ISO date (optional, defaults to today)"
}
```

Response is always 200 (errors are reported in the `decision` field,
not HTTP status, except for auth/parse failures):

```
{
  "decision": "allow" | "deny" | "no_contract_on_file",
  "reason": "string",
  "adjudication": { "status", "allowed", "plan_paid", "member_responsibility", "deductible_applied", "coinsurance" } | undefined,
  "risk_tier": "low" | "medium" | "high" | "critical",
  "used_empty_accumulators": boolean | undefined,
  "contract_id": "string | null",
  "plan_id": "string | null",
  "timestamp": "ISO datetime"
}
```
