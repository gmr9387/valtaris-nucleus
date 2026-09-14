// Phase 5.3 — ExternalIdentityAdapter
// High‑fidelity adapter: external identity → NucleusIdentity

import { NucleusIdentity, NucleusSubsystem } from "../identity/nucleusIdentity";

export interface RawExternalIdentity {
  tenantId?: unknown;
  projectId?: unknown;
  environmentId?: unknown;
  actorId?: unknown;
  // Optional raw blob for debugging/telemetry
  raw?: unknown;
}

export interface ExternalIdentity {
  tenantId: string;
  projectId: string;
  environmentId: string;
  actorId?: string;
  raw?: unknown;
}

export class ExternalIdentityAdapter {
  /**
   * Strict normalization: raw external identity → ExternalIdentity.
   * tenantId/projectId/environmentId are constitutionally required for
   * tenant/project/environment isolation, so a missing value fails fast
   * instead of silently defaulting into the wrong boundary.
   */
  static normalize(raw: RawExternalIdentity): ExternalIdentity {
    if (typeof raw.tenantId !== "string" || raw.tenantId.trim() === "") {
      throw new Error("External identity missing required tenantId");
    }
    if (typeof raw.projectId !== "string" || raw.projectId.trim() === "") {
      throw new Error("External identity missing required projectId");
    }
    if (typeof raw.environmentId !== "string" || raw.environmentId.trim() === "") {
      throw new Error("External identity missing required environmentId");
    }

    const actorId = typeof raw.actorId === "string" ? raw.actorId : undefined;

    return {
      tenantId: raw.tenantId,
      projectId: raw.projectId,
      environmentId: raw.environmentId,
      actorId,
      raw: raw.raw,
    };
  }

  /**
   * ExternalIdentity → NucleusIdentity. subsystem/capability describe the
   * call this identity is being used for, so they come from the caller
   * rather than the external identity payload itself.
   */
  static toNucleusIdentity(
    external: ExternalIdentity,
    subsystem: NucleusSubsystem,
    capability: string,
  ): NucleusIdentity {
    return {
      tenantId: external.tenantId,
      projectId: external.projectId,
      environmentId: external.environmentId,
      actorId: external.actorId,
      subsystem,
      capability,
    };
  }

  /**
   * Raw external identity → NucleusIdentity (full pipeline)
   */
  static fromRaw(
    raw: RawExternalIdentity,
    subsystem: NucleusSubsystem,
    capability: string,
  ): NucleusIdentity {
    const normalized = this.normalize(raw);
    return this.toNucleusIdentity(normalized, subsystem, capability);
  }
}
