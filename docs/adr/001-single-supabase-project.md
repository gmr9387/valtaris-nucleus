# ADR-001: One shared Supabase project instead of one per service

## Status
Accepted (implemented, live).

## Context
Nucleus, DualPay, and valtaris-glue started as three independent
Supabase projects: `qrqekucwdfyqqzomuble` (nucleus), a standalone
DualPay project, and a standalone glue project. Each of DualPay's three
"nucleus-proxy" Edge Functions (`nucleus-adjudicate`,
`nucleus-weaver-score`, `nucleus-guardian-status`) called nucleus's real
functions (`adjudicate-claim`, `weaver-score`, `guardian-status`) over
plain HTTPS, across project boundaries, authenticated by a shared API
key. Supabase's free/starter tier caps a account at 2 active projects,
which made "3 independent projects" not just architecturally awkward
but literally unsustainable without paying for capacity the ecosystem
didn't otherwise need.

## Decision
Collapse to a single Supabase project. Each app keeps its own Postgres
**schema** (`public` for nucleus's own tables, `dualpay`, `glue`)
instead of its own project. DualPay's and glue's full schemas (tables,
RLS policies, functions, RPCs) were inventoried and replicated into
this project under their own schema, their live data migrated, their
Edge Functions redeployed here with `db: { schema: '<app>' }` set on
their Supabase clients, and their frontends repointed at this
project's URL/keys. The old standalone projects were paused, then
decommissioned.

Nucleus's own proxy functions now call `adjudicate-claim` /
`weaver-score` / `guardian-status` as same-project HTTPS calls, not
cross-project ones — see `supabase/functions/nucleus-adjudicate/README.md`
(and its two siblings) in the DualPay repo.

## Alternatives considered
- **Keep 3 projects, pay for a higher tier.** Rejected: turns a design
  choice into a recurring cost with no functional benefit — the
  cross-project call was doing nothing a same-project call doesn't also
  do, since both sides trust the same API-key mechanism either way.
- **Merge into one schema instead of one-schema-per-app.** Rejected:
  would require renaming every table across all three apps to avoid
  collisions (`claims` exists in more than one app's domain) and
  would make each app's RLS policies harder to reason about in
  isolation. Schema-per-app keeps each app's own migrations, RLS, and
  `supabase.from(...)` calls unchanged except for one `db.schema`
  client option.

## Consequences
- One Supabase bill, one set of project-level settings (auth
  providers, rate limits, pooler config) to keep correct for all three
  apps at once — a misconfiguration now affects all three, not one.
- Cross-app calls that used to cross a network/project boundary are now
  same-project HTTPS calls to a different schema's Edge Function —
  faster, but also means a bug in one app's Edge Function code runs
  under the same project's resource limits as the other two.
- Schema names are now a real namespacing contract: `dualpay.*` and
  `glue.*` tables must never collide with `public.*` or each other.

## Failure modes / what breaks if this is wrong
- **Noisy-neighbor risk**: a runaway query or Edge Function invocation
  spike in one app's schema competes for the same connection pool and
  compute as the other two. There's no project-level isolation left to
  fall back on.
- **Blast radius on a bad migration**: applying a migration to the
  wrong schema, or one that accidentally references another schema's
  table, now fails inside a project that two other live apps depend on
  — there's no "just the standalone DualPay project broke" containment
  anymore.
- Reversal path exists (re-provision standalone projects, replay each
  schema's migrations there, repoint each app) but hasn't been
  exercised — it would need to be treated as a real migration project,
  not a config flip.
