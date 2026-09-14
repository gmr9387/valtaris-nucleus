// Phase 37 — Environment Activation Manifest

export interface EnvironmentActivationManifest {
  environments: string[];
  defaultEnvironment: string;
  activationOrder: string[];
}

export const environmentActivationManifest: EnvironmentActivationManifest = {
  environments: ["dev", "staging", "prod"],
  defaultEnvironment: "dev",
  activationOrder: ["dev", "staging", "prod"],
};
