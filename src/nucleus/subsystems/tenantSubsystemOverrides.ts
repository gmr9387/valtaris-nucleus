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
