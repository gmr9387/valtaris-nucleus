# Phase 05 — Pack Metadata + Versioning
Strict. Aligned. No drift. No overengineering.

This file defines metadata and versioning rules for Packs in the Valtaris Ecosystem.
Metadata and versioning ensure deterministic behavior across orgs and regions.

============================================================
# 1. PURPOSE
============================================================

Define:
- pack metadata fields
- semantic versioning rules
- compatibility matrix
- dependency graph rules

No dynamic versioning. No auto-upgrades. Strict control.

============================================================
# 2. METADATA FIELDS
============================================================

Each pack exposes the following metadata:

- name
- version
- description
- capabilities
- entrypoint
- publisher
- created_at
- updated_at

Stored in:
`supabase.public.pack_registry`

Strict field list. No custom metadata.

============================================================
# 3. SEMANTIC VERSIONING
============================================================

Version format:
MAJOR.MINOR.PATCH

Rules:
- MAJOR: breaking changes
- MINOR: new capabilities, no breaking changes
- PATCH: bug fixes, no capability changes

Examples:
1.0.0
1.1.0
1.1.1
2.0.0

Strict semver. No custom version formats.

============================================================
# 4. COMPATIBILITY MATRIX
============================================================

Each pack version must define compatibility with:
- Nucleus version
- Glue version
- DualPay version
- Other packs (optional)

Matrix stored in:
pack_registry.compatibility (jsonb)

Example:
{
  "nucleus": ">=1.0.0",
  "glue": ">=2.1.0",
  "dualpay": ">=1.3.0"
}

Strict compatibility rules. No wildcard compatibility.

============================================================
# 5. DEPENDENCY GRAPH
============================================================

Packs may depend on other packs.

Dependency rules:
- must specify exact version
- no circular dependencies
- no wildcard dependencies
- dependency must exist in marketplace

Example:
{
  "dependencies": [
    { "pack": "identity-core", "version": "1.2.0" }
  ]
}

Dependency graph stored in:
pack_registry.dependencies (jsonb)

============================================================
# 6. VERSION RESOLUTION
============================================================

When installing a pack:
1. Validate version exists
2. Validate compatibility matrix
3. Validate dependencies
4. Resolve dependency versions
5. Pin versions for deterministic behavior

No auto-upgrades. No floating versions.

============================================================
# 7. VERSION HISTORY
============================================================

Each pack maintains a version history.

Stored in:
pack_registry_versions

Columns:
- pack_id
- version
- changelog
- created_at

Used for:
- rollback
- audit
- compliance

============================================================
# 8. COMPLETION CRITERIA
============================================================

Phase 5 is complete when:
- metadata fields defined
- semver rules defined
- compatibility matrix defined
- dependency graph defined
- version resolution rules defined
- version history defined

============================================================
# END OF PHASE 05
============================================================
