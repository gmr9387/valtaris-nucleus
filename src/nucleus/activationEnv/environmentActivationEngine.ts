// Phase 37 — Environment Activation Engine

import { environmentActivationManifest } from "./environmentActivationManifest";
import { environmentState } from "./environmentState";
import { runEnvironmentHealthCheck } from "./environmentHealthCheck";

export class EnvironmentActivationEngine {
  activate(environment: string) {
    if (!environmentActivationManifest.environments.includes(environment)) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    const state = environmentState[environment];
    state.activated = true;
    state.lastActivatedAt = new Date().toISOString();

    const healthy = runEnvironmentHealthCheck(environment);

    return {
      environment,
      activated: state.activated,
      healthy,
      lastActivatedAt: state.lastActivatedAt,
    };
  }

  activateAll() {
    return environmentActivationManifest.activationOrder.map((env) =>
      this.activate(env)
    );
  }

  getState(environment: string) {
    return environmentState[environment];
  }
}

export const environmentActivationEngine = new EnvironmentActivationEngine();
