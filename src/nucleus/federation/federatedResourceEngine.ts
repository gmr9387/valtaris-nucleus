// Phase 38 — Federated Resource Engine

import { resourceGraph } from "../resources/resourceGraph";
import { federatedIdentityEngine } from "./federatedIdentityEngine";
import type { Dynamic } from "../types/dynamic";

export class FederatedResourceEngine {
  create(resourceId: string, type: string, identity: Dynamic, data: Dynamic) {
    const enforcement = federatedIdentityEngine.enforce(identity);

    if (!enforcement.tenantValid || !enforcement.environmentValid) {
      throw new Error("Federation identity violation");
    }

    return resourceGraph.createResource(resourceId, type, identity, data);
  }

  listByTenant(tenantId: string) {
    return resourceGraph.listResources().filter((r) => r.identity.tenantId === tenantId);
  }

  listByEnvironment(environmentId: string) {
    return resourceGraph.listResources().filter((r) => r.identity.environmentId === environmentId);
  }
}

export const federatedResourceEngine = new FederatedResourceEngine();
