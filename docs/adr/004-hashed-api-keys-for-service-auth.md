# ADR-004: Hashed API keys in `api_clients` for subsystem-to-subsystem auth

## Status

Accepted (implemented, live).

## Context

DualPay and valtaris-glue call Nucleus's real Edge Functions
(`adjudicate-claim`, `weaver-score`, `guardian-status`) as external
callers — there's no end user's Supabase session/JWT attached to these
calls, since they originate from another service's own backend, not
from a signed-in browser. Something has to authenticate "this caller is
really DualPay" (or "really glue") without relying on Supabase Auth's
normal user-session model, which doesn't apply here.

## Decision

A dedicated `api_clients` table (deliberately outside RLS — see
`src/lib/api-clients.ts`'s header comment) stores `client_id`,
`key_hash` (SHA-256 hex of a raw key — the raw key itself is never
stored anywhere), `enabled`, and `organization_id` (which tenant this
caller acts as). Raw keys are generated as `vnk_<client_id>_<32 random
bytes, base64url-no-padding>`. A single Edge Function,
`manage-api-clients`, is the only sanctioned way to create, rotate,
list, or enable/disable these — it requires the caller to be a
signed-in owner/admin of some org, and returns the raw key exactly once
at creation/rotation time. Every external-facing function
(`adjudicate-claim`, `weaver-score`, `guardian-status`) validates
incoming calls via a shared `verifyApiKey()` helper that does the
identical SHA-256 hex lookup.

This is the same pattern used to (re)issue DualPay's own key mid-session
when its plaintext value's handoff couldn't be confirmed: rotate
through `manage-api-clients`' algorithm, store only the hash, hand the
plaintext to the operator once, outside the repo (see the DualPay
repo's `nucleus-adjudicate/README.md` and
`20260925010000_rotate_dualpay_nucleus_api_key.sql`).

## Alternatives considered

- **Shared static secret in an env var on both sides.** Rejected:
  no per-caller identity (can't tell DualPay's calls from glue's, can't
  revoke one without revoking both), no rotation story beyond "change
  the env var everywhere simultaneously."
- **Service-to-service JWTs (mint a Supabase service-role-signed token
  per caller).** Not pursued: adds a token-minting and expiry/refresh
  flow for a problem hashed static keys solve more simply here, given
  these are long-lived server-to-server relationships (DualPay always
  calls as DualPay), not per-request user identities that need
  short-lived tokens.
- **Store raw keys instead of hashes, for easier support/debugging.**
  Rejected outright — this is the one place in the whole ecosystem
  where "never store plaintext secrets" is a hard rule stated in the
  code itself (`manage-api-clients`' own doc comment), because a
  compromised `api_clients` table would otherwise hand over every
  service's credentials at once.

## Consequences

- Revocation is per-`client_id` and instant: `set_enabled: false` or a
  rotate (which overwrites `key_hash`, not appends) invalidates that
  one caller's old key immediately without touching any other caller.
- The raw key exists in exactly one place after generation: the
  operator's own secret store (here, a `supabase secrets set
NUCLEUS_API_KEY=...` the operator runs themselves). No tool in this
  session's toolset can read or write Edge Function secrets — confirmed
  by exhausting the available Supabase MCP tools — which means this
  handoff is inherently a manual, human step, by design as much as by
  tooling limitation.
- `organization_id` on `api_clients` means the key _is_ the tenant
  binding for these calls — a leaked DualPay key can only act as
  DualPay's org, not arbitrarily as any tenant.

## Failure modes / what breaks if this is wrong

- If a raw key leaks (logged accidentally, committed to a file, pasted
  somewhere persistent), the blast radius is exactly the calls that
  `client_id` is authorized to make, scoped to its `organization_id` —
  bounded, but rotation is still a fully manual, reactive step today;
  there's no automated leak-detection or forced-rotation trigger.
- `api_clients` has no RLS by design (it has to be queryable by the
  Edge Function's service-role client before any user identity exists
  in the request). That makes the Edge Function code itself — not the
  database — the only thing standing between an unauthenticated caller
  and this table, which is a materially different trust model from
  every RLS-protected table in ADR-002 and worth remembering when
  reasoning about this table specifically.
