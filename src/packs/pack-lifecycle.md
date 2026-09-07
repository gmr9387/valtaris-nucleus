# Phase 04 — Pack Lifecycle
Strict. Aligned. No drift. No overengineering.

This file defines the Pack Lifecycle for the Valtaris Ecosystem Layer.
Lifecycle = how packs move through install, update, remove, and rollback.

============================================================
# 1. PURPOSE
============================================================

Define deterministic lifecycle rules for:
- installing packs
- updating packs
- removing packs
- version pinning
- version rollback

No dynamic behavior. No auto-magic. Strict lifecycle.

============================================================
# 2. LIFECYCLE STATES
============================================================

Each pack can be in one of these states:

- "available"     (in marketplace)
- "installed"     (installed in org)
- "active"        (loaded by Nucleus)
- "disabled"      (installed but inactive)
- "removed"       (uninstalled)

Strict state list. No custom states.

============================================================
# 3. INSTALL FLOW
============================================================

Install steps:

1. Validate manifest
2. Validate version compatibility
3. Insert pack into pack_registry (org-level)
4. Mark state = "installed"
5. Trigger Nucleus loader
6. Mark state = "active"

Install API:
POST /api/packs/install

Payload:
- pack_id
- version

============================================================
# 4. UPDATE FLOW
============================================================

Update steps:

1. Validate new version
2. Check compatibility matrix
3. Download new version metadata
4. Replace entrypoint reference
5. Mark state = "active"
6. Store previous version for rollback

Update API:
POST /api/packs/update

Payload:
- pack_id
- new_version

============================================================
# 5. REMOVE FLOW
============================================================

Remove steps:

1. Disable pack (state = "disabled")
2. Unload from Nucleus
3. Remove pack metadata from org-level registry
4. Mark state = "removed"

Remove API:
POST /api/packs/remove

Payload:
- pack_id

============================================================
# 6. VERSION PINNING
============================================================

Each org can pin a pack to a specific version.

Pinned versions:
- prevent auto-updates
- enforce deterministic behavior
- ensure compliance stability

Pinned versions stored in:
pack_registry.version_pinned (boolean)

============================================================
# 7. VERSION ROLLBACK
============================================================

Rollback steps:

1. Validate previous version exists
2. Replace entrypoint reference
3. Mark state = "active"
4. Store rollback event in audit ledger

Rollback API:
POST /api/packs/rollback

Payload:
- pack_id
- target_version

============================================================
# 8. COMPLETION CRITERIA
============================================================

Phase 4 is complete when:
- Install flow defined
- Update flow defined
- Remove flow defined
- Version pinning defined
- Rollback defined
- Lifecycle states enforced

============================================================
# END OF PHASE 04
============================================================
