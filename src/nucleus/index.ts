// valtaris-nucleus/src/nucleus/index.ts

import { startNucleus as startNucleusCanonical } from "./startNucleus";

/**
 * FIXED: this file previously defined its own startNucleus() that called
 * DeploymentBootstrap.start() with zero arguments -- but that method now
 * requires an explicit organizationId, so any caller importing
 * startNucleus from "./nucleus" instead of "./nucleus/startNucleus" would
 * get a broken call at runtime.
 *
 * Rather than maintain two functions with the same name and different
 * signatures, this now re-exports the real one. Anything importing from
 * "./nucleus" and anything importing from "./nucleus/startNucleus" now
 * gets the identical, correct implementation.
 */
export function startNucleus(organizationId: string) {
  return startNucleusCanonical(organizationId);
}
