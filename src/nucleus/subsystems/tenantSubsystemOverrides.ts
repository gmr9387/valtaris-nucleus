// src/nucleus/subsystems/tenantSubsystemOverrides.ts
//
// gapMap.md's Weaver gap "Multi-tenant subsystem activation rules" and
// DualPay gap "Multi-tenant payment isolation hooks" -- subsystemRegistry.ts's
// `enabled` flag was global only: there was no way to disable a subsystem
// for one tenant without disabling it for every tenant on the platform.
// That's a real gap for a multi-tenant SaaS -- "this customer's plan
// doesn't include DualPay" is an ordinary business rule, not an edge
// case -- and nothing in src/nucleus/* could express it.
//
// This adds a real per-org override, checked alongside the global flag
// at the one real enforcement point every dispatch already goes through
// (RuntimeGuards.enforceSubsystemPermission's governance rule -- see
// that file). It does not invent a fake "plan tier" lookup or a fake
// admin UI to drive it: nothing in this codebase has a real source of
// truth for which tenant should have which subsystem disabled (that's a
// Supabase-backed product decision, outside src/nucleus/*). What's built
// here is the real mechanism an eventual real caller (a plan-tier check,
// an admin action) would call -- matching this repo's own precedent of
// building the real plumbing before the business rule that drives it
// exists ("build all the plumbing now, activate later").
//
// gapMap.md's Guardian gap "Versioned governance rules (diffs +
// snapshots)": StateEngine's diff/snapshot capability already runs on
// every real dispatch (RuntimeRouter.dispatch()) but had never been
// applied to policy history itself -- there was no real policy whose
// changes were worth tracking until this override existed. Every real
// change now also goes through StateEngine, so it gets a real version
// number and diff trail for free, the same mechanism dispatch already
// trusts, not a new one invented for this file.
import { nucleusState } from "../state/stateEngine";

const overrides = new Map<string, Map<string, boolean>>(); // org -> subsystemId -> enabled

export function setTenantSubsystemEnabled(
  organizationId: string,
  subsystemId: string,
  enabled: boolean,
): void {
  if (!overrides.has(organizationId)) {
    overrides.set(organizationId, new Map());
  }
  overrides.get(organizationId)!.set(subsystemId, enabled);

  nucleusState.set(organizationId, subsystemId, "tenantOverride", enabled);
}

/**
 * The real diff trail for this org's (or this org+subsystem's) override
 * changes -- gapMap.md's "Versioned governance rules" gap, closed via
 * StateEngine rather than a second, parallel history mechanism.
 */
export function getTenantSubsystemOverrideHistory(organizationId: string, subsystemId?: string) {
  return nucleusState
    .getDiffs(organizationId, subsystemId)
    .filter((diff) => diff.key === "tenantOverride");
}

/**
 * Returns the tenant-specific override for this subsystem, or
 * `undefined` if this org has no override -- meaning "defer to the
 * global subsystemRegistry.enabled flag."
 */
export function getTenantSubsystemOverride(
  organizationId: string,
  subsystemId: string,
): boolean | undefined {
  return overrides.get(organizationId)?.get(subsystemId);
}

export function getTenantSubsystemOverrides(organizationId: string): Record<string, boolean> {
  return Object.fromEntries(overrides.get(organizationId) ?? []);
}

export function clearTenantSubsystemOverrides(organizationId?: string): void {
  if (organizationId) {
    overrides.delete(organizationId);
  } else {
    overrides.clear();
  }
}
