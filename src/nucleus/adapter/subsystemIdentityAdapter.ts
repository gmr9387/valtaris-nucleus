// Phase 6.3 — SubsystemIdentityAdapter
// Normalizes subsystem identity → NucleusIdentity

import { NucleusIdentity, NucleusSubsystem } from "../identity/nucleusIdentity";

export interface RawSubsystemIdentity {
  tenantId: string;
  projectId: string;
  environmentId: string;
  actorId?: string;
  subsystemContext?: unknown;
}

export class SubsystemIdentityAdapter {
  /**
   * subsystem/capability describe the call this identity is being used
   * for, so they come from the caller rather than the raw subsystem
   * identity payload itself.
   */
  static normalize(
    raw: RawSubsystemIdentity,
    subsystem: NucleusSubsystem,
    capability: string,
  ): NucleusIdentity {
    if (!raw.tenantId || !raw.projectId || !raw.environmentId) {
      throw new Error("Subsystem identity missing required tenantId/projectId/environmentId");
    }

    return {
      tenantId: raw.tenantId,
      projectId: raw.projectId,
      environmentId: raw.environmentId,
      actorId: raw.actorId,
      subsystem,
      capability,
    };
  }
}
