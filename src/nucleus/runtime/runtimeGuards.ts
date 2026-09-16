// src/nucleus/runtime/runtimeGuards.ts
//
// The centralized guard contract referenced by subsystemRegistry.ts's
// own header comment ("this file is scoped specifically to what
// RuntimeGuards.enforceSubsystemPermission expects") but never actually
// implemented anywhere in this snapshot -- the same class of gap as the
// missing RuntimeRouter this file's sibling closes.
//
// Scope is deliberately narrow: this owns exactly the enforcement
// OSPipeline.dispatch() used to inline (subsystem exists, subsystem is
// enabled) so there is one place that answers "is this subsystem
// allowed to run right now," not a broader ACL/role system -- org-level
// authorization is Guardian's own job as the authorization *stage* of
// the claim (see guardianRuntime.ts), a different concern from whether
// a subsystem is registered and switched on at all.

import {
  getSubsystem,
  type SubsystemId,
  type SubsystemRegistration,
} from "../subsystems/subsystemRegistry";

export class RuntimeGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeGuardError";
  }
}

export class RuntimeGuards {
  /**
   * Resolves a subsystem and proves it's allowed to run: registered,
   * and enabled. Throws RuntimeGuardError otherwise. Returns the
   * registration so callers (RuntimeRouter) don't have to look it up
   * a second time.
   */
  static enforceSubsystemPermission(id: SubsystemId | string): SubsystemRegistration {
    const subsystem = getSubsystem(id);
    if (!subsystem) {
      throw new RuntimeGuardError(`RuntimeGuards: subsystem "${id}" is not registered.`);
    }
    if (!subsystem.enabled) {
      throw new RuntimeGuardError(`RuntimeGuards: subsystem "${id}" is disabled.`);
    }
    return subsystem;
  }
}
