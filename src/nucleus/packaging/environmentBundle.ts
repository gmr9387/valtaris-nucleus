// Phase 36 — Environment Bundle

import { environmentDeploymentMap } from "../deployment/environmentDeploymentMap";

export interface EnvironmentBundle {
  environment: string;
  subsystems: string[];
}

export function createEnvironmentBundle(environment: string): EnvironmentBundle {
  const entry = environmentDeploymentMap.find((e) => e.environment === environment);

  if (!entry) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  return {
    environment: entry.environment,
    subsystems: entry.subsystems,
  };
}
