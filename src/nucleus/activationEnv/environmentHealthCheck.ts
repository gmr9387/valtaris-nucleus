// Phase 37 — Environment Health Check

import { environmentState } from "./environmentState";

export function runEnvironmentHealthCheck(environment: string): boolean {
  const state = environmentState[environment];

  // Simple constitutional health rule:
  // An environment is healthy if it has been activated at least once.
  const healthy = state.activated === true;

  state.healthy = healthy;
  return healthy;
}
