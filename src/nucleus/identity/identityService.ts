// src/nucleus/identity/identityService.ts
// Corrected Full File — Unified Identity Service

import { IdentityContext } from "./identityContext";
import { NucleusTelemetryAdapter } from "../telemetry/nucleusTelemetryAdapter";

export class IdentityService {
  private telemetry: NucleusTelemetryAdapter;

  constructor(private ctx: IdentityContext) {
    this.telemetry = new NucleusTelemetryAdapter(ctx.organizationId, ctx.subsystem);

    this.telemetry.debug("IdentityService initialized", {
      organizationId: ctx.organizationId,
      subsystem: ctx.subsystem,
      actor: ctx.actor ?? "system",
      roles: ctx.roles ?? [],
    });
  }

  // -----------------------------
  // Organization Identity
  // -----------------------------
  getOrganizationId() {
    return this.ctx.organizationId;
  }

  // -----------------------------
  // Subsystem Identity
  // -----------------------------
  getSubsystem() {
    return this.ctx.subsystem;
  }

  // -----------------------------
  // Actor Identity
  // -----------------------------
  getActor() {
    return this.ctx.actor || "system";
  }

  // -----------------------------
  // Role Identity
  // -----------------------------
  getRoles() {
    return this.ctx.roles || [];
  }

  hasRole(role: string) {
    return this.getRoles().includes(role);
  }
}
