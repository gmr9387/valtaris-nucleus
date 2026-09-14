// Phase 37 — Environment State

export interface EnvironmentState {
  environment: string;
  activated: boolean;
  healthy: boolean;
  lastActivatedAt?: string;
}

export const environmentState: Record<string, EnvironmentState> = {
  dev: { environment: "dev", activated: false, healthy: false },
  staging: { environment: "staging", activated: false, healthy: false },
  prod: { environment: "prod", activated: false, healthy: false },
};
