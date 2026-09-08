// src/nucleus/runtime/nucleusBoot.ts

import { NucleusRuntime } from "./nucleusRuntime";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";

export function nucleusBoot(subsystem: string, organizationId: string) {
  if (!organizationId) {
    throw new Error("nucleusBoot() requires organizationId");
  }

  // Register all subsystems before runtime starts
  registerAllSubsystems();

  const runtime = new NucleusRuntime(subsystem, organizationId);
  runtime.boot();

  return runtime;
}
