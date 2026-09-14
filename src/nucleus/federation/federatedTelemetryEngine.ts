// Phase 38 — Federated Telemetry Engine

import { telemetryEngine } from "../telemetry/telemetryEngine";

export class FederatedTelemetryEngine {
  listByTenant(tenantId: string) {
    return telemetryEngine.list().filter((entry) => entry.identity?.tenantId === tenantId);
  }

  listByEnvironment(environmentId: string) {
    return telemetryEngine
      .list()
      .filter((entry) => entry.identity?.environmentId === environmentId);
  }
}

export const federatedTelemetryEngine = new FederatedTelemetryEngine();
