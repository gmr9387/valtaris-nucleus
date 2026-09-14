// Phase 35 — Environment Deployment Map

import { deploymentManifest } from "./deploymentManifest";

export interface EnvironmentDeployment {
  environment: string;
  subsystems: string[];
}

export const environmentDeploymentMap: EnvironmentDeployment[] =
  deploymentManifest.environments.map((env) => ({
    environment: env,
    subsystems: deploymentManifest.subsystems,
  }));
