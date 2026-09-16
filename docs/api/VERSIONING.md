# Nucleus external API versioning policy

Applies to the three endpoints in `docs/api/nucleus-external-api.yaml`:
`adjudicate-claim`, `weaver-score`, `guardian-status`.

## The rule

A deployed endpoint's request/response contract never changes once a
real caller depends on it. Every response from these three endpoints
carries an `X-Api-Version: v1` header (set in each function's
`CORS_HEADERS`, so it's on every response including errors) — that
value is a promise, not a label.

When a change to one of these endpoints would alter its contract
(a field renamed or removed, a type changed, a new required request
field, a status code that used to mean one thing now meaning
another), it ships as a **new, separate Edge Function** — e.g.
`adjudicate-claim-v2` — deployed alongside the existing one. The old
slug keeps running unmodified, still answering `X-Api-Version: v1`,
until every caller has migrated off it and it's deliberately retired.

Additive, backward-compatible changes (a new optional request field,
a new response field a caller can ignore) can go directly into the
current version without a bump.

## Why this shape, not a `/v1/` URL prefix

Supabase Edge Functions are addressed by a flat slug
(`/functions/v1/<slug>`); there's no first-class support for a
literal `/v1/adjudicate-claim` path without merging all three
endpoints behind one routing function, which isn't worth the added
complexity and shared blast radius for three endpoints with distinct
auth/rate-limit/logic. A version-suffixed sibling slug gets the same
outcome — old and new contracts coexisting, a caller choosing when to
move — without that merge.

## Why callers don't need to hardcode the version

Every current caller (DualPay's `nucleus-adjudicate`,
`nucleus-weaver-score`, `nucleus-guardian-status` proxy functions)
resolves nucleus's URL from an Edge Function secret
(`NUCLEUS_ADJUDICATE_URL`, etc.) rather than a hardcoded path. Moving
a caller to a new contract version is a one-line secret update on
their side, not a code change — the same mechanism that already
decouples DualPay from nucleus's project ID and domain.
