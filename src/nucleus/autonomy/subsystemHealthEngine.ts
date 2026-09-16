// Phase 39 — Subsystem Health Engine

import { getSubsystem, type SubsystemId } from "../subsystems/subsystemRegistry";
import { nucleusDiagnostics } from "../diagnostics/diagnosticsEngine";
import { nucleusHealth } from "../health/healthEngine";
import { nucleusRecovery } from "../recovery/recoveryEngine";

export interface SubsystemHealth {
  subsystem: string;
  healthy: boolean;
  lastCheckedAt: string;
}

// health/healthEngine.ts, diagnostics/diagnosticsEngine.ts, and
// recovery/recoveryEngine.ts (gapMap.md's "Unified Recovery Engine", #8)
// were all fully built -- rules/checks/actions, audit + billing hooks,
// the works -- with zero real callers anywhere in the codebase. Their
// only would-be caller was this file, and it never actually called them:
// `healthy = true` was a hardcoded "constitutional assumption," not a
// check, so nothing downstream (autonomy's health.checkAll(), now run on
// every real boot via constitutionalPipeline's "autonomy.initialize"
// step) was ever proven, and selfHealingEngine's `heal()` could never
// fire since the health it read was always healthy by construction.
//
// This registers one real diagnostic per subsystem (is it registered
// and enabled in subsystemRegistry.ts -- the same live signal
// RuntimeGuards/GovernanceEngine already gate every dispatch on) and one
// real recovery action (re-enable it if it was disabled), then routes
// through the actual DiagnosticsEngine -> HealthEngine -> RecoveryEngine
// chain instead of the stub. "platform" is used as the org scope here
// because this is infra-level boot health, not a per-tenant claim --
// the same scope RuntimeGuards already registers its governance rules
// under.
const PLATFORM_ORG = "platform";
const registered = new Set<string>();

function ensureChecksRegistered(subsystem: string): void {
  if (registered.has(subsystem)) return;
  registered.add(subsystem);

  nucleusDiagnostics.register(
    PLATFORM_ORG,
    subsystem,
    "registered.enabled",
    `Subsystem "${subsystem}" must be registered and enabled.`,
    () => {
      const s = getSubsystem(subsystem as SubsystemId);
      return !!s && s.enabled;
    },
  );

  nucleusRecovery.register(
    PLATFORM_ORG,
    subsystem,
    "reenable",
    `Re-enable subsystem "${subsystem}" if it was found disabled.`,
    () => {
      const s = getSubsystem(subsystem as SubsystemId);
      if (!s) return false;
      s.enabled = true;
      return true;
    },
  );
}

export class SubsystemHealthEngine {
  async check(subsystem: string): Promise<SubsystemHealth> {
    ensureChecksRegistered(subsystem);

    const health = await nucleusHealth.check(PLATFORM_ORG, subsystem);

    return {
      subsystem,
      healthy: health.status === "healthy",
      lastCheckedAt: new Date(health.timestamp).toISOString(),
    };
  }

  async checkAll(subsystems: string[]): Promise<SubsystemHealth[]> {
    return Promise.all(subsystems.map((s) => this.check(s)));
  }
}

export const subsystemHealthEngine = new SubsystemHealthEngine();
