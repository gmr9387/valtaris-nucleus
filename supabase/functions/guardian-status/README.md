# guardian-status

Nucleus's real, external-facing Guardian safety-status API — the third
of the octopus-head API trio alongside `adjudicate-claim` and
`weaver-score`. Answers one question for any arm in the ecosystem: is
it currently safe to keep processing claims?

## What this is

A read-only Supabase Edge Function (Deno) that reports the same
`guardian_kill_switch` state `guardianRuntime.ts` checks internally
before any adjudication work — giving an arm running its *own* local
calculation engine (DualPay's `calculation-engine.ts`, for example) a
way to see nucleus's safety signal without adopting nucleus's
adjudication logic wholesale.

Deliberately **read-only**: this endpoint cannot activate or
deactivate the kill switch. That stays an operator action inside
nucleus's own admin UI (`/contracts` → Guardian Kill Switch tab),
gated to owner/admin roles. An external arm can only ask, never tell.

## Auth

`x-api-key` header, checked against the same `api_clients.key_hash`
table `adjudicate-claim` and `weaver-score` use — one credential
authorizes all three nucleus endpoints. `verify_jwt` is disabled since
callers are other services, not Supabase-authenticated end users.

## Deploying changes

This directory is the git-tracked source of truth; deploy it with the
Supabase CLI (`supabase functions deploy guardian-status`) or the
`deploy_edge_function` MCP tool, passing all files in this directory.

## Request / response

```
GET /functions/v1/guardian-status
x-api-key: <key>
```

Always 200 except auth failures (a kill-switch-fetch failure reports
`safe_to_process: false` rather than erroring — same fail-closed
convention `guardianRuntime.ts` and `adjudicate-claim` use):

```
{
  "safe_to_process": "boolean — false whenever the kill switch is active OR its state couldn't be verified",
  "kill_switch_active": "boolean | null (null only if the state couldn't be verified)",
  "reason": "string | null",
  "activated_by": "string | null",
  "kill_switch_updated_at": "ISO datetime | null",
  "timestamp": "ISO datetime"
}
```
