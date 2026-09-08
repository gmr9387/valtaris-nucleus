// src/nucleus/integrations/runtime.ts

import { nucleusBoot } from "../runtime/nucleusBoot";

export function startIntegrationRuntime(subsystem: string, organizationId: string) {
  return nucleusBoot(subsystem, organizationId);
}
