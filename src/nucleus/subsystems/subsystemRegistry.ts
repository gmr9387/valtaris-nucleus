// src/nucleus/subsystems/subsystemRegistry.ts

/**
 * Subsystem Registry (fixed)
 * --------------------------
 * This is the authoritative registry RuntimeRouter and registerSubsystems.ts
 * both expect. Previously this file only exported the SubsystemId type —
 * registerSubsystem() and getSubsystem() were imported from here but did
 * not exist here, causing RuntimeRouter.dispatch() to be unable to resolve
 * any subsystem at all.
 *
 * NOTE: This is a SEPARATE registry from src/integrations/integrationRegistry.ts,
 * which registers subsystems under different ids ("decision-weaver" instead of
 * "weaver", no "telemetry"/"contracts"). That registry is used elsewhere
 * (glue/guardian/weaver/dualpay integration adapters) — do not merge the two
 * without deciding which is canonical first. This file is scoped specifically
 * to what RuntimeGuards.enforceSubsystemPermission expects: "weaver",
 * "guardian", "glue", "dualpay", "contracts", "telemetry".
 */

export type SubsystemId =
  | "contracts"
  | "guardian"
  | "glue"
  | "weaver"
  | "dualpay"
  | "telemetry";

export interface SubsystemRegistration {
  id: SubsystemId;
  label: string;
  enabled: boolean;
  runtime: {
    handle: (contractName: string, payload: any, ctx?: any) => any;
  };
}

const registry = new Map<SubsystemId, SubsystemRegistration>();

/**
 * Register a subsystem's runtime under its canonical id.
 */
export function registerSubsystem(subsystem: SubsystemRegistration): void {
  registry.set(subsystem.id, subsystem);
}

/**
 * Retrieve a subsystem registration by id.
 * Returns null if the subsystem has not been registered
 * (e.g. registerAllSubsystems() was never called on boot).
 */
export function getSubsystem(id: SubsystemId | string): SubsystemRegistration | null {
  return registry.get(id as SubsystemId) ?? null;
}

/**
 * Retrieve all registered subsystems. Useful for boot-time
 * diagnostics ("what actually got registered").
 */
export function getAllSubsystems(): SubsystemRegistration[] {
  return Array.from(registry.values());
}

/**
 * Clear the registry. Intended for test isolation only —
 * lets tests call registerAllSubsystems() fresh without
 * state leaking between test files.
 */
export function resetSubsystemRegistry(): void {
  registry.clear();
}
