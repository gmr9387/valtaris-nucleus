// src/nucleus/startNucleus.ts

import { DeploymentBootstrap } from "./deployment/bootstrap";

/**
 * Canonical startup surface for Valtaris Nucleus.
 * Every startup path in the system must call ONLY this function.
 */
export async function startNucleus(organizationId: string, port?: number) {
  if (!organizationId) {
    throw new Error("startNucleus() requires an explicit organizationId");
  }

  console.log("Starting Valtaris Nucleus for organization:", organizationId);

  await DeploymentBootstrap.start(organizationId, port);

  console.log("Valtaris Nucleus startup complete.");
}
