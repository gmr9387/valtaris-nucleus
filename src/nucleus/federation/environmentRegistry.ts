// Phase 38 — Environment Registry

import { federationManifest } from "./federationManifest";

export interface FederatedEnvironmentState {
  environmentId: string;
  active: boolean;
  createdAt: string;
}

export const environmentRegistry: Record<string, FederatedEnvironmentState> =
  Object.fromEntries(
    federationManifest.environments.map((env) => [
      env,
      {
        environmentId: env,
        active: true,
        createdAt: new Date().toISOString(),
      },
    ])
  );
