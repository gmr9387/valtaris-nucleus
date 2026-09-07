# Phase 02 — Extension System
Strict. Aligned. No drift. No overengineering.

This file defines the Extension System for the Valtaris Ecosystem Layer.
Extensions add behavior to packs without modifying engines or core pack code.

============================================================
# 1. PURPOSE
============================================================

Extensions allow packs to:
- hook into Nucleus events
- add workflow handlers
- add monitoring handlers
- add identity handlers
- add audit handlers

Extensions are optional add-ons, not core pack logic.

============================================================
# 2. EXTENSION STRUCTURE
============================================================

Each extension follows this exact structure:

/packs/<pack-name>/extensions/<extension-name>/
  manifest.json
  index.ts
  handlers/
  schemas/

Strict uniformity. No deviation.

============================================================
# 3. EXTENSION MANIFEST (manifest.json)
============================================================

Required fields:

{
  "name": "string",
  "version": "string",
  "description": "string",
  "hooks": ["string"],
  "entrypoint": "index.ts"
}

No optional fields. No dynamic fields.

============================================================
# 4. EXTENSION METADATA
============================================================

Metadata extracted from manifest:
- name
- version
- description
- hooks
- entrypoint

Stored in:
`supabase.public.extension_registry`

Columns:
- id (uuid)
- pack_id (uuid)
- name (text)
- version (text)
- description (text)
- hooks (jsonb)
- entrypoint (text)
- created_at
- updated_at

============================================================
# 5. EXTENSION REGISTRATION API
============================================================

POST /api/extensions/register

Payload:
- extension manifest.json
- parent pack_id

Steps:
1. Validate manifest
2. Validate parent pack exists
3. Insert metadata into extension_registry
4. Return extension_id

Strict validation. No auto-correction.

============================================================
# 6. EXTENSION LOADER (NUCLEUS)
============================================================

Responsibilities:
- Read extension manifest
- Load entrypoint
- Bind hooks to Nucleus events
- Enforce sandbox boundaries (Phase 6)

Loader rules:
- Never mutate extension code
- Never bypass validation
- Never auto-fix errors

============================================================
# 7. HOOK TYPES
============================================================

Supported hook categories:
- workflow.before
- workflow.after
- workflow.error
- identity.before
- identity.after
- audit.before
- audit.after
- monitoring.signal

Strict list. No custom hook names.

============================================================
# 8. COMPLETION CRITERIA
============================================================

Phase 2 is complete when:
- Extension structure enforced
- Manifest validated
- Metadata stored
- Registration API functional
- Nucleus loads extensions deterministically
- Hooks bind correctly

============================================================
# END OF PHASE 02
============================================================
