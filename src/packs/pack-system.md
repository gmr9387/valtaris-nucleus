# Phase 01 — Pack System (Core)
Strict. Aligned. No drift. No overengineering.

This file defines the core Pack System for Valtaris.  
Packs extend Valtaris without modifying engines.

============================================================
# 1. PACK STRUCTURE
============================================================

Each pack must follow this exact structure:

/packs/<pack-name>/
  manifest.json
  index.ts
  capabilities/
  handlers/
  schemas/

No deviation. No optional folders. Strict uniformity.

============================================================
# 2. MANIFEST SCHEMA (manifest.json)
============================================================

Required fields:

{
  "name": "string",
  "version": "string",
  "description": "string",
  "capabilities": ["string"],
  "entrypoint": "index.ts"
}

No optional fields. No dynamic fields.

============================================================
# 3. PACK REGISTRY TABLE (Supabase)
============================================================

Table: pack_registry

Columns:
- id (uuid)
- name (text)
- version (text)
- description (text)
- capabilities (jsonb)
- entrypoint (text)
- created_at (timestamp)
- updated_at (timestamp)

============================================================
# 4. PACK REGISTRATION API
============================================================

POST /api/packs/register

Payload:
- manifest.json

Steps:
1. Validate manifest
2. Insert metadata into pack_registry
3. Return pack_id

Strict validation. No auto-correction.

============================================================
# 5. PACK LOADER (NUCLEUS)
============================================================

Responsibilities:
- Read manifest
- Load entrypoint
- Bind capabilities
- Enforce sandbox boundaries (Phase 6)

Loader rules:
- Never mutate pack code
- Never auto-fix errors
- Never bypass validation

============================================================
# 6. COMPLETION CRITERIA
============================================================

Phase 1 is complete when:
- Pack structure enforced
- Manifest validated
- Metadata stored
- Registration API functional
- Nucleus loads packs deterministically

============================================================
# END OF PHASE 01
============================================================
