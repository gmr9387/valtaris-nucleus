# Phase 03 — Marketplace UI
Strict. Aligned. No drift. No overengineering.

This file defines the Marketplace UI layer for the Valtaris Ecosystem.
The Marketplace is how orgs discover, install, and manage Packs.

============================================================
# 1. PURPOSE
============================================================

Provide a clean, deterministic UI for:
- discovering packs
- viewing pack details
- installing packs
- managing installed packs
- publisher dashboards

No extra features. No UI bloat.

============================================================
# 2. MARKETPLACE PAGES
============================================================

Required pages:

1. /marketplace
   - Pack list
   - Search bar
   - Category filters

2. /marketplace/<pack-name>
   - Pack details
   - Version list
   - Capability list
   - Install button

3. /marketplace/publisher
   - Publisher dashboard
   - Pack submissions
   - Pack status (approved, pending, suspended)

Strict page list. No additional routes.

============================================================
# 3. PACK LIST REQUIREMENTS
============================================================

Each pack card must show:
- name
- description
- version
- capabilities (summary)
- publisher

No animations. No dynamic sorting. Keep it clean.

============================================================
# 4. PACK DETAIL REQUIREMENTS
============================================================

Pack detail page must show:
- full description
- version history
- capability list
- install button
- publisher info

Install button triggers:
POST /api/packs/install

============================================================
# 5. SEARCH + FILTERS
============================================================

Search:
- name
- description
- capabilities

Filters:
- category
- publisher
- capability type

Strict filter set. No custom filters.

============================================================
# 6. PUBLISHER DASHBOARD
============================================================

Publisher dashboard shows:
- submitted packs
- pack status
- version history
- submission actions

No analytics. No charts. Keep it minimal.

============================================================
# 7. COMPLETION CRITERIA
============================================================

Phase 3 is complete when:
- Marketplace pages exist
- Pack list renders from pack_registry
- Pack detail renders from pack_registry
- Install button calls install API
- Publisher dashboard renders publisher packs

============================================================
# END OF PHASE 03
============================================================
