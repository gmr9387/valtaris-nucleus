// Phase 49 — Deployment Engine

import { deploymentManifest } from "./deploymentManifest";
import { deploymentProviders } from "./deploymentProviders";
import { deploymentState } from "./deploymentState";
import type { Dynamic } from "../types/dynamic";

export class DeploymentEngine {
  async deploy() {
    if (!deploymentManifest.enabled) {
      throw new Error("Deployment disabled by manifest");
    }

    const services = [];

    for (const key of Object.keys(deploymentProviders)) {
      if ((deploymentManifest as Dynamic)[key]) {
        const result = await (deploymentProviders as Dynamic)[key]();
        services.push(result);
      }
    }

    deploymentState.deployed = true;
    deploymentState.lastDeployedAt = new Date().toISOString();
    deploymentState.services = services;

    return deploymentState;
  }
}

export const deploymentEngine = new DeploymentEngine();
