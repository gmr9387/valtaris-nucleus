// Phase 35 — Subsystem Deployment Map

import { deploymentManifest } from "./deploymentManifest";

export interface SubsystemDeployment {
  subsystem: string;
  capabilities: string[];
  contracts: string[];
  resources: string[];
}

export const subsystemDeploymentMap: SubsystemDeployment[] = deploymentManifest.subsystems.map(
  (subsystem) => {
    const capabilities = deploymentManifest.capabilities.filter((c) =>
      c.startsWith(`${subsystem}.`),
    );

    const contracts = deploymentManifest.contracts.filter((c) => c.includes(`(${subsystem}.`));

    const resources = deploymentManifest.resources.filter((r) => r.includes(`(${subsystem}.`));

    return {
      subsystem,
      capabilities,
      contracts,
      resources,
    };
  },
);
