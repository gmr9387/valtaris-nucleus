// Phase 44 — CI Manifest

export interface CIManifest {
  enabled: boolean;
  suites: string[];
}

export const ciManifest: CIManifest = {
  enabled: true,
  suites: [
    "constitution.tests",
    "sovereignty.tests",
    "activation.tests",
    "federation.tests",
    "autonomy.tests",
    "pipeline.tests",
    "adapters.tests",
    "resources.tests",
    "lineage.tests",
    "telemetry.tests",
    "audit.tests",
  ],
};
