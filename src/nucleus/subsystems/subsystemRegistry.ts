// src/nucleus/subsystems/subsystemRegistry.ts

import type { Dynamic } from "../types/dynamic";
/**
 * Subsystem Registry (fixed)
 * --------------------------
 * This is the authoritative registry RuntimeRouter and registerSubsystems.ts
 * both expect. Previously this file only exported the SubsystemId type —
 * registerSubsystem() and getSubsystem() were imported from here but did
 * not exist here, causing RuntimeRouter.dispatch() to be unable to resolve
 * any subsystem at all.
 *
 * NOTE: this comment used to warn about a second, separate registry at
 * src/integrations/integrationRegistry.ts (which used "decision-weaver"
 * instead of "weaver" as an id). That file was deleted before this
 * session's work started (confirmed via git log against the deleted
 * path) -- this is the only subsystem registry in the codebase now.
 * This file is scoped specifically to what
 * RuntimeGuards.enforceSubsystemPermission expects: "weaver",
 * "guardian", "glue", "dualpay", "telemetry".
 *
 * "contracts" was removed from this type when the ContractsRuntime
 * subsystem (and the NucleusApi prototype it only existed to serve)
 * was retired -- see registerSubsystems.ts's own comment.
 */

export type SubsystemId = "guardian" | "glue" | "weaver" | "dualpay" | "telemetry";

export interface SubsystemRegistration {
  id: SubsystemId;
  label: string;
  enabled: boolean;
  runtime: {
    handle: (contractName: string, payload: Dynamic, ctx?: Dynamic) => Dynamic;
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
