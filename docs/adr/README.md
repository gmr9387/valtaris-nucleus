# Architecture Decision Records

`valtaris_constitution` (repo root) states the ecosystem's authority
boundaries — what Nucleus/Weaver/Guardian/Glue/DualPay are each allowed
to do. It doesn't say why the platform underneath those boundaries is
built the way it is, what else was considered, or what breaks if the
decision turns out to be wrong. That's what this directory is for.

Each ADR here documents a decision that's already live in this
ecosystem (this repo, DualPay, or valtaris-glue) — not a proposal. Every
one cites the actual migration, table, or source file that implements
it, and every "Consequences" / "Failure modes" section describes real,
current behavior, not aspiration. If a decision gets reversed later,
the old ADR stays (marked Superseded) and a new one replaces it — the
record of *why* something changed is more valuable than a clean history.

| ADR | Decision |
|---|---|
| [001](001-single-supabase-project.md) | One shared Supabase project (schema-per-app) instead of one database per service |
| [002](002-rls-as-tenant-boundary.md) | Postgres RLS, not application code, is the tenant-isolation enforcement point |
| [003](003-security-definer-choke-point.md) | `is_org_member`/`has_org_role` SECURITY DEFINER functions as the single place membership rules are enforced |
| [004](004-hashed-api-keys-for-service-auth.md) | Hashed API keys in `api_clients`, not shared secrets or JWTs, for subsystem-to-subsystem calls |
| [005](005-durable-postgres-queue.md) | Postgres-backed durable queue instead of an in-memory queue for Nucleus's background runtime |
| [006](006-four-subsystem-authority-split.md) | Weaver/Guardian/Glue/DualPay as enforced authority boundaries, not just organizational convention |
