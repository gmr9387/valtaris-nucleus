// Phase 38 — Federated Lineage Engine

import { lineageEngine } from "../lineage/lineageEngine";

export class FederatedLineageEngine {
  listByTenant(tenantId: string) {
    return lineageEngine.list().filter((entry) => entry.identity.tenantId === tenantId);
  }

  listByEnvironment(environmentId: string) {
    return lineageEngine.list().filter((entry) => entry.identity.environmentId === environmentId);
  }
}

export const federatedLineageEngine = new FederatedLineageEngine();
