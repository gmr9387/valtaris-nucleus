// src/nucleus/runtime/osEntry.validation.ts

import type { Dynamic } from "../types/dynamic";
/**
 * OS Entry Validation (Phase 18)
 *
 * Pure defensive validation for OS entrypoint.
 * No external dependencies.
 */

export class OSEntryValidation {
  static validateOrganizationId(orgId: Dynamic) {
    if (!orgId || typeof orgId !== "string") {
      throw new Error("Invalid organizationId");
    }
  }

  static validateClaimPayload(payload: Dynamic) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid claimPayload");
    }

    if (!payload.claimId || typeof payload.claimId !== "string") {
      throw new Error("Invalid claimId");
    }

    if (typeof payload.amount !== "number") {
      throw new Error("Invalid claimPayload.amount");
    }
  }
}
