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
import { nucleusGovernance } from "../governance/governanceEngine";
import type { Dynamic } from "../types/dynamic";

export class RuntimeGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeGuardError";
  }
}

// governance/governanceEngine.ts is another fully-built engine (rules +
// decisions, audit + billing hooks) with zero real callers anywhere in
// the codebase -- confirmed by grepping for GovernanceEngine/
// nucleusGovernance outside its own file. Its own shape is exactly what
// this guard already does by hand ("is this subsystem allowed to run
// right now"), so rather than inventing an unrelated call site, the
// existing enabled/disabled check below now IS a governed rule: one
// real GovernanceDecision, audited and billed, on every single dispatch
// for every subsystem -- not synthetic data, the actual live outcome.
const governanceRuleIds = new Map<string, string>();

function governanceRuleFor(id: string, subsystem: SubsystemRegistration): string {
  const existing = governanceRuleIds.get(id);
  if (existing) return existing;

  const rule = nucleusGovernance.register(
    "platform",
    id,
    "subsystem.enabled",
    `Subsystem "${id}" must be registered and enabled to dispatch.`,
    () => subsystem.enabled,
  );
  governanceRuleIds.set(id, rule.id);
  return rule.id;
}

export class RuntimeGuards {
  /**
   * Resolves a subsystem and proves it's allowed to run: registered,
   * and enabled (governed via GovernanceEngine, see above). Throws
   * RuntimeGuardError otherwise. Returns the registration so callers
   * (RuntimeRouter) don't have to look it up a second time.
   */
  static enforceSubsystemPermission(
    id: SubsystemId | string,
    payload?: Dynamic,
  ): SubsystemRegistration {
    const subsystem = getSubsystem(id);
    if (!subsystem) {
      throw new RuntimeGuardError(`RuntimeGuards: subsystem "${id}" is not registered.`);
    }

    const ruleId = governanceRuleFor(id, subsystem);
    const decision = nucleusGovernance.enforce(ruleId, payload ?? {});
    if (!decision?.allowed) {
      throw new RuntimeGuardError(`RuntimeGuards: subsystem "${id}" is disabled.`);
    }

    return subsystem;
  }
}
