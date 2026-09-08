// src/nucleus/startNucleus.ts

import { DeploymentBootstrap } from "./deployment/bootstrap";

/**
 * Canonical startup surface for Valtaris Nucleus.
 * Every startup path in the system must call ONLY this function.
 */
export function startNucleus(organizationId: string) {
  if (!organizationId) {
    throw new Error("startNucleus() requires an explicit organizationId");
  }

  console.log("Starting Valtaris Nucleus for organization:", organizationId);

  DeploymentBootstrap.start(organizationId);

  console.log("Valtaris Nucleus startup complete.");
}
